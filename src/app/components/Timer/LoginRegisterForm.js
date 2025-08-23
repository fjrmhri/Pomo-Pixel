import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import "../../styles/SettingsForm.css";

/**
 * Komponen untuk menampilkan form login atau register.
 */
function LoginRegisterForm({ setIsLoggedIn }) {
  const [currentForm, setCurrentForm] = useState("login");

  /**
   * Ganti form yang sedang ditampilkan.
   * @param {string} formName Nama form yang akan ditampilkan
   */
  const toggleForm = (formName) => {
    try {
      setCurrentForm(formName);
    } catch (error) {
      console.error("Gagal mengganti form:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full overflow-y-auto">
      {currentForm === "login" ? (
        <Login setIsLoggedIn={setIsLoggedIn} />
      ) : (
        <Register setIsLoggedIn={setIsLoggedIn} />
      )}
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
