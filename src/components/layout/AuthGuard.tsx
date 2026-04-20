"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useStore();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isAuthenticated && pathname !== '/login') {
            router.push('/login');
        }
    }, [isAuthenticated, pathname, router, mounted]);

    if (!mounted) {
        return null; // Prevents hydration mismatch
    }

    // Allow login page to render without layout immediately
    if (pathname === '/login') {
        return <>{children}</>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
