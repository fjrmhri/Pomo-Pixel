import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../../firebase";

function Login({ setIsLoggedIn }) {
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLoginGoogle = async () => {
    setErrorMessage("");
    setSedangMemuat(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result?.user;

      if (user) {
        const nama = user.displayName || user.email || "Pengguna";
        await setDoc(
          doc(db, "users", user.uid),
          {
            name: nama,
            email: user.email || "",
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }

      setIsLoggedIn?.(true);
    } catch (error) {
      setErrorMessage("Gagal login: " + error.message);
      console.error("Login: gagal login pengguna:", error);
    } finally {
      setSedangMemuat(false);
    }
  };

  return (
    <div className="pixel-card pixel-card--borderless w-full h-full overflow-y-auto max-w-md mx-auto p-6">
      <div className="Sf__section-title">Login</div>
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleLoginGoogle}
          className="Sf__btn Sf__btn--primary w-full mt-2"
          disabled={sedangMemuat}
        >
          {sedangMemuat ? "Loading..." : "Login with Google"}
        </button>
        <p className="text-xs text-center text-[color:var(--overlay-foreground)]">
          Gunakan akun Google Anda untuk masuk dan sinkronkan progres.
        </p>
      </div>
      {errorMessage && (
        <div className="text-red-400 text-xs mt-3 text-center">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default Login;
