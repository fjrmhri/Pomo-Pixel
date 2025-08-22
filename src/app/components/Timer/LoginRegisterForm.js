import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import { redirectToGitHub } from "../../github";

function LoginRegisterForm({ setIsLoggedIn }) {
  const [currentForm, setCurrentForm] = useState("login");

  const toggleForm = (formName) => {
    setCurrentForm(formName);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {currentForm === "login" ? (
        <Login setIsLoggedIn={setIsLoggedIn} />
      ) : (
        <Register setIsLoggedIn={setIsLoggedIn} />
      )}
      <button
        type="button"
        onClick={() => redirectToGitHub()}
        className="pixel-btn pixel-btn--primary w-full"
      >
        Login with GitHub
      </button>
      <button
        type="button"
        onClick={() =>
          toggleForm(currentForm === "login" ? "register" : "login")
        }
        className="mt-2 text-[var(--aksen-amber)] underline text-sm hover:text-[var(--aksen-violet)]"
      >
        {currentForm === "login"
          ? "Need an account? Register"
          : "Already have an account? Login"}
      </button>
    </div>
  );
}

export default LoginRegisterForm;
