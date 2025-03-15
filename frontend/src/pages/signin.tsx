import { useState } from "react";
import { signInUser, signOutUser } from "../config/amplify";
import { useRouter } from "next/router";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      // Ensure any existing session is cleared before signing in
      await signOutUser(); 

      await signInUser(email, password);

      console.log("Sign-in successful!");
       
      // Redirect after login
      router.push("/dashboard");
    } catch (err: any) {
      setMessage("Error signing in: " + err.message);
    }
  };

  return (
    <div className="flex flex-col items-center p-10">
      <h2 className="text-2xl">Sign In</h2>
      <input
        type="email"
        placeholder="Email"
        className="p-2 border"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="p-2 border mt-2"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="mt-4 bg-blue-500 text-white px-4 py-2" onClick={handleSignIn}>
        Sign In
      </button>
      {message && <p className="mt-4 text-red-500">{message}</p>}
    </div>
  );
}
