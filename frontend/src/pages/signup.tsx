import { useState } from "react";
import { Auth } from "../config/amplify";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const signUp = async () => {
    try {
      await Auth.signUp({ username: email, password });
      setMessage("Sign-up successful! Check your email for verification.");
    } catch (err) {
      setMessage("Error signing up: " + err.message);
    }
  };

  return (
    <div className="flex flex-col items-center p-10">
      <h2 className="text-2xl">Sign Up</h2>
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
      <button className="mt-4 bg-blue-500 text-white px-4 py-2" onClick={signUp}>
        Sign Up
      </button>
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
