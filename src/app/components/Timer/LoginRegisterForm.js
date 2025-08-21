import { useState } from "react";
import Login from "./Login";
import Register from "./Register";

function LoginRegisterForm({ setIsLoggedIn }) {
  const [currentForm, setCurrentForm] = useState("login");

  const toggleForm = (formName) => {
    setCurrentForm(formName);
  };

  return (
    <div className="form-switch-container">
      {currentForm === "login" ? (
        <Login setIsLoggedIn={setIsLoggedIn} />
      ) : (
        <Register setIsLoggedIn={setIsLoggedIn} />
      )}
      <button
        onClick={() =>
          toggleForm(currentForm === "login" ? "register" : "login")
        }
      >
        {currentForm === "login"
          ? "Need an account? Register"
          : "Already have an account? Login"}
      </button>
    </div>
  );
}

export default LoginRegisterForm;
