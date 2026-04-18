import Login from "./Login";
import { useEffect, useRef, useState } from "react";
import "../../styles/SettingsForm.css";

/**
 * Komponen untuk menampilkan form login gabungan (Google + GitHub)
 */
function LoginRegisterForm({ googleUser, githubUser, onClose }) {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const prevLoggedInRef = useRef(false);

  useEffect(() => {
    const isLoggedIn = Boolean(googleUser || githubUser);
    const wasLoggedIn = prevLoggedInRef.current;

    if (isLoggedIn && !wasLoggedIn) {
      setShowSuccessMessage(true);
      const timeoutId = setTimeout(() => {
        setShowSuccessMessage(false);
        onClose?.();
      }, 1200);
      prevLoggedInRef.current = isLoggedIn;
      return () => clearTimeout(timeoutId);
    }

    prevLoggedInRef.current = isLoggedIn;
  }, [githubUser, googleUser, onClose]);

  // If both providers connected, nothing to show (per spec)
  if (googleUser && githubUser && !showSuccessMessage) return null;

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full overflow-y-auto">
      <Login
        googleUser={googleUser}
        githubUser={githubUser}
        showSuccessMessage={showSuccessMessage}
      />
    </div>
  );
}

export default LoginRegisterForm;
