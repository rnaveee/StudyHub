"use server";

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { upsertChatroom, upsertChatroomMember, upsertCourse, upsertCurrentUser } from "../utils/uploadHelpers";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import type { SearchResult } from "../data";
import { z } from "zod";

export type CreateChatroomState = { error: string | null };

const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

const courseSchema = z.object({
    classId: z.preprocess(emptyToUndef, z.string().trim().max(20)),
    className: z.preprocess(emptyToUndef, z.string().trim().max(100)),
    professor: z.preprocess(emptyToUndef, z.string().trim().max(50).optional()),
    finalExamDate: z.preprocess(emptyToUndef, z.iso.date().refine(
        (d) => new Date(d) >= new Date(new Date().toDateString()), { message: "Final exam date must be today or in the future." })
        .optional())
});

const searchSchema = z.object({
    query: z.string().toLowerCase().trim().max(100)
        .transform((s) => s.replace(/[,()"]/g, "")),
    school: z.string().toLowerCase().trim().max(100),
});

const chatroomIdSchema = z.uuid();

export async function createChatroom(
    prevState: CreateChatroomState,
    formData: FormData
): Promise<CreateChatroomState> {

    const courseParsed = courseSchema.safeParse({
        classId: formData.get("classId"),
        className: formData.get("className"),
        professor: formData.get("professor"),
        finalExamDate: formData.get("finalExamDate"),
    });

    if (!courseParsed.success) {
        return { error: courseParsed.error.issues[0].message };
    }

    const { classId, className, professor, finalExamDate } = courseParsed.data;

    const profile = await upsertCurrentUser();

    if (!profile.school_id) {
        return { error: "Set your school in your profile before creating a chatroom." };
    }

    const schoolId = profile.school_id;

    const supabaseAdmin = getSupabaseAdmin();

    const { data: existingCourse, error: existingCourseError } = await supabaseAdmin
        .from("courses")
        .select("id")
        .eq("class_id", classId)
        .eq("school_id", schoolId)
        .maybeSingle();

    if (existingCourseError) {
        return { error: "Unable to check for existing chatrooms." };
    }

    if (existingCourse) {
        return { error: "A chatroom already exists for that class and school. Try searching for it!" };
    }

    let chatroomId: string;
    try {
        const course = await upsertCourse(
            classId,
            className,
            professor ?? null,
            schoolId,
            finalExamDate ?? null,
            profile.id
        );
        const chatroom = await upsertChatroom(course.id, profile.id);
        await upsertChatroomMember(chatroom.id, profile.id);
        chatroomId = chatroom.id;
    } catch (err) {
        console.error("createChatroom failed:", err);
        return { error: "Couldn't create chatroom. Please try again." };
    }

    revalidatePath("/dashboard");
    redirect(`/chatrooms/${chatroomId}`);
}

export async function joinChatroom(formData: FormData) {
    
    const chatroomIdParsed = chatroomIdSchema.safeParse(
        formData.get("chatroomId")
    );

    if (!chatroomIdParsed.success) {
        const first = chatroomIdParsed.error.issues[0];
        const message = `${first.path.join(".") || "input"}: ${first.message}`;
        redirect(`/dashboard?error=${encodeURIComponent(message)}`);
    }

    const chatroomId = chatroomIdParsed.data;

    const profile = await upsertCurrentUser();

    try {
        await upsertChatroomMember(chatroomId, profile.id);
    } catch (err) {
        console.error("joinChatroom failed:", err);
        redirect("/dashboard?error=Couldn%27t%20join%20chatroom.%20Please%20try%20again.");
    }

    revalidatePath("/dashboard");
    redirect(`/chatrooms/${chatroomId}`);
}

export async function searchChatrooms(formData: FormData): Promise<SearchResult[]> {

    const searchParsed = searchSchema.safeParse({
        query: formData.get("query"),
        school: formData.get("school")
    });

    if(!searchParsed.success) {
        return [];
    }

    const { query, school } = searchParsed.data;

    if(query === "" && school === ""){
        return [];
    }

    const profile = await upsertCurrentUser();
    const supabaseAdmin = getSupabaseAdmin();

    let schoolIds: string[] | null = null;
    if (school) {
        const { data: matchingSchools, error: schoolLookupError } = await supabaseAdmin
            .from("schools")
            .select("id")
            .ilike("name", `%${school}%`);

        if (schoolLookupError) {
            throw schoolLookupError;
        }

        if (!matchingSchools || matchingSchools.length === 0) {
            return [];
        }

        schoolIds = matchingSchools.map((s) => s.id);
    }

    let q = supabaseAdmin
        .from("chatrooms")
        .select(`
            id,
            ongoing,
            chatroom_members(
                user_id
            ),
            courses!inner(
                id,
                class_id,
                class_name,
                professor,
                created_by,
                schools!inner(
                    id,
                    name,
                    color
                )
            )
        `)
        .limit(20);
        

    if(query){
        q = q.or(
            `class_id.ilike.%${query}%,class_name.ilike.%${query}%`,
            { foreignTable: "courses" }
        );
    }
    if(schoolIds){
        q = q.in("courses.school_id", schoolIds);
    }

    const {data: chatrooms, error: queryError} = await q;

    if (queryError) {
        throw queryError;
    }

    return chatrooms.map((chatroom) => {
        const course = Array.isArray(chatroom.courses)
            ? chatroom.courses[0]
            : chatroom.courses;

        if (!course) {
            throw new Error("Filtered chatroom unexpectedly has no course.");
        }

        const schoolRow = Array.isArray(course.schools)
            ? course.schools[0]
            : course.schools;

        if (!schoolRow) {
            throw new Error("Filtered chatroom unexpectedly has no school.");
        }

        const joinedUsers = chatroom.chatroom_members?.length ?? 0;

        const isJoined =
            chatroom.chatroom_members?.some(
                (member) => member.user_id === profile.id
            ) ?? false;

        return {
            chatroomId: chatroom.id,
            classId: course.class_id,
            className: course.class_name,
            professor: course.professor,
            school: {
                id: schoolRow.id,
                name: schoolRow.name,
                color: schoolRow.color,
            },
            joinedUsers,
            isJoined,
        };
    });
}