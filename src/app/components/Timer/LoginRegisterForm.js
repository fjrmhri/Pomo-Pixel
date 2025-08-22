import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import { redirectToGitHub } from "../../github";

/**
 * Pembungkus form login dan registrasi.
 * Menampilkan salah satu form dan menyediakan tombol untuk berpindah.
 */
function LoginRegisterForm({ setIsLoggedIn }) {
  const [currentForm, setCurrentForm] = useState("login");

  // Ganti form yang sedang ditampilkan dengan validasi nama
  const toggleForm = (formName) => {
    if (formName !== "login" && formName !== "register") {
      console.error(`Form tidak dikenal: ${formName}`);
      return;
    }
    setCurrentForm(formName);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      {currentForm === "login" ? (
        <Login setIsLoggedIn={setIsLoggedIn} />
      ) : (
        <Register setIsLoggedIn={setIsLoggedIn} />
      )}
      <button
        type="button"
        onClick={() => redirectToGitHub()}
        className="Sf__btn Sf__btn--primary w-full mt-2"
      >
        Login with GitHub
      </button>
      {currentForm === "login" ? (
        <button
          type="button"
          onClick={() => toggleForm("register")}
          className="mt-2 text-[var(--aksen-amber)] underline text-sm hover:text-[var(--aksen-violet)]"
        >
          Need an account? Register
        </button>
      ) : (
        <p className="mt-2 text-sm">
          Have an account?{" "}
          <button
            type="button"
            onClick={() => toggleForm("login")}
            className="text-[var(--aksen-amber)] underline hover:text-[var(--aksen-violet)]"
          >
            Login
          </button>
        </p>
      )}
    </div>
  );
}

export default LoginRegisterForm;
