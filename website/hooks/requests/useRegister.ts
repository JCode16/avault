import { useMutation } from "react-query";
import { request } from "../../src/request";

export const register = async (credentials: any) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(credentials)) {
        form.append(key, value as string);
    }
    const response = await request(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
            method: "POST",
            body: form,
        }
    );

    return response.json();
};

export const useRegister = () => {
    return useMutation(register);
};
