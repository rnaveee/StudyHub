"use client";

import { useState } from "react";

type ErrorMsgProps = {
    message?: string | null;
};

export default function ErrorMsg({ message }: ErrorMsgProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!message || !isVisible) {
        return null;
    }

    return (
        <div
            role="alert"
            className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 border border-red-200 rounded-full bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg"
        >
            <span className="break-words">{message}</span>
            <button
                type="button"
                aria-label="Close error message"
                onClick={() => setIsVisible(false)}
                className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-red/80 transition hover:bg-red/15 hover:text-red-500"
            >
                <span aria-hidden="true" className="text-lg leading-none">
                    &times;
                </span>
            </button>
        </div>
    );
}
