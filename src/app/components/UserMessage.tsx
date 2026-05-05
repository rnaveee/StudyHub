
type UserMessageProps = {
    message: string;
};

export default function UserMessage({ message }: UserMessageProps){
    return(
        <div className="flex w-full justify-end">
            <div className="max-w-[62.5%] whitespace-pre-wrap break-words rounded-lg bg-purple-600 px-3 py-2 text-sm text-white shadow-sm">
                {message}
            </div>
        </div>
    );
}
