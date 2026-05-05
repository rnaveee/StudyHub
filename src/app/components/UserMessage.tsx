
import Image from "next/image";

type UserMessageProps = {
    message: string;
    avatarUrl?: string | null;
};

export default function UserMessage({ message, avatarUrl }: UserMessageProps){
    return(
        <div className="flex w-full items-end justify-end gap-2">
            <div className="max-w-[62.5%] whitespace-pre-wrap break-words rounded-lg bg-purple-600 px-3 py-2 text-sm text-white shadow-sm">
                {message}
            </div>
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt="Your avatar"
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                ) : (
                <div className="h-8 w-8 shrink-0 rounded-full bg-purple-300" />
            )}
        </div>
    );
}
