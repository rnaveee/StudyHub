
type OtherUserMessageProps = {
    message: string;
};


export default function OtherUserMessage({ message }: OtherUserMessageProps){
    return(
        <div className="flex w-full justify-start">
            <div className="max-w-[62.5%] whitespace-pre-wrap break-words rounded-lg bg-slate-600 px-3 py-2 text-sm text-white shadow-sm">
                {message}
            </div>
        </div>
    );
}