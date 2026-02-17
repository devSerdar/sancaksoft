"use client";

import { useState, useEffect } from "react";

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 639px)");
        setIsMobile(mq.matches);
        const onResize = () => setIsMobile(mq.matches);
        mq.addEventListener("change", onResize);
        return () => mq.removeEventListener("change", onResize);
    }, []);
    return isMobile;
}
