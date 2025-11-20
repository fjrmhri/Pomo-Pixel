import Login from "./Login";
import "../../styles/SettingsForm.css";

/**
 * Komponen untuk menampilkan form login.
 */
function LoginRegisterForm({ setIsLoggedIn }) {
  return (
    <div className="flex flex-col items-center gap-4 w-full h-full overflow-y-auto">
      <Login setIsLoggedIn={setIsLoggedIn} />
    </div>
  );
}

export default LoginRegisterForm;
