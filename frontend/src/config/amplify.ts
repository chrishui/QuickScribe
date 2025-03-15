import { Amplify } from "aws-amplify";
import { fetchAuthSession, getCurrentUser, signIn, signOut } from "@aws-amplify/auth";
import awsConfig from "./aws-exports";

Amplify.configure(awsConfig);

export const getAuthToken = async () => {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      console.warn("User is not authenticated");
      return null;
    }

    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error("Error fetching auth token:", error);
    return null;
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    return await signIn({ username: email, password });
  } catch (error: any) {
    console.error("Sign-in error:", error.message);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut({ global: true });
    console.log("User signed out successfully.");
  } catch (error) {
    console.error("Sign-out error:", error);
  }
};