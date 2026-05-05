
import Image from "next/image";

type OtherUserMessageProps = {
    message: string;
    avatarUrl?: string | null;
};


export default function OtherUserMessage({ message, avatarUrl }: OtherUserMessageProps){
    return(
        <div className="flex w-full items-end justify-start gap-2">
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt="User avatar"
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                ) : (
                <div className="h-8 w-8 shrink-0 rounded-full bg-slate-400" />
            )}
            <div className="max-w-[62.5%] whitespace-pre-wrap break-words rounded-lg bg-slate-600 px-3 py-2 text-sm text-white shadow-sm">
                {message}
            </div>
        </div>
    );
}
