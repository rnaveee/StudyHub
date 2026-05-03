type ErrorMsgProps = {
    message?: string | null;
};

export default function ErrorMsg({ message }: ErrorMsgProps) {
    if (!message) {
        return null;
    }

    return (
        <div
            role="alert"
            className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
            {message}
        </div>
    );
}
