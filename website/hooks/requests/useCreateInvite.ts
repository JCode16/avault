import { useMutation } from "react-query";

type PostData = {
    max_uses: number;
    max_age: number;
};

export const createInvite = async ({
    body,
    channelId,
}: {
    channelId: string;
    body: PostData;
}) => {
    const data = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/invites`,
        {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        }
    );
    return data.json();
};

export const useCreateInvite = () => useMutation(createInvite as any);