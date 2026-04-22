import { ChatMessage, UserProfile } from "@/store/useStore";

// Using a public REST API for prototype persistence on Vercel
// ff8081819d82fab6019db2c6ba1f0343 is our dedicated shared storage object ID
const STORAGE_API_URL = "https://api.restful-api.dev/objects/ff8081819d82fab6019db2c6ba1f0343";

interface ExternalState {
    messages: Record<string, ChatMessage[]>;
    participants: Record<string, UserProfile[]>;
    rooms: Record<string, any>;
    users: Record<string, UserProfile>;
}

export async function getExternalStore(): Promise<ExternalState | null> {
    try {
        const res = await fetch(STORAGE_API_URL, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data as ExternalState;
    } catch (e) {
        console.error("Failed to fetch external store", e);
        return null;
    }
}

export async function updateExternalStore(update: Partial<ExternalState>): Promise<void> {
    try {
        const currentState = await getExternalStore();
        if (!currentState) return;

        const newState = {
            ...currentState,
            ...update
        };

        await fetch(STORAGE_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "warroom_prototype",
                data: newState
            })
        });
    } catch (e) {
        console.error("Failed to update external store", e);
    }
}
