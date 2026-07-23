import { supabase } from "../../lib/supabaseClient";
import { syncCartWithServer } from "@/ui/scripts/cartSync";

const cleanPasswordFromUrl = () => {
  const currentUrl = new URL(window.location.href);
  if (!currentUrl.searchParams.has("password")) return;

  currentUrl.searchParams.delete("password");
  window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}`);
};

const initializeLoginForm = () => {
  cleanPasswordFromUrl();

  const loginForm = document.getElementById("login-form");
  if (!(loginForm instanceof HTMLFormElement)) return;
  if (loginForm.dataset.loginInitialized === "true") return;
  loginForm.dataset.loginInitialized = "true";

  const submitButton = document.getElementById("submit-button");
  const buttonText = document.getElementById("button-text");
  const loadingSpinner = document.getElementById("loading-spinner");
  const errorDisplay = document.getElementById("error-message");

  const showError = (message: string) => {
    if (!errorDisplay) return;
    errorDisplay.classList.remove("hidden");
    errorDisplay.textContent = message;
  };

  const resetError = () => {
    if (!errorDisplay) return;
    errorDisplay.classList.add("hidden");
    errorDisplay.textContent = "";
  };

  const setLoading = (isLoading: boolean) => {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = isLoading;
    }
    buttonText?.classList.toggle("opacity-50", isLoading);
    loadingSpinner?.classList.toggle("hidden", !isLoading);
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const returnTo = loginForm.dataset.returnTo || "/";

    resetError();

    if (!email || !password) {
      showError("Ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      try {
        await syncCartWithServer("merge");
      } catch (syncError) {
        console.warn("Cart sync after login failed:", syncError);
      }

      window.location.assign(returnTo);
    } catch (error) {
      console.error("Login error:", error);
      const message = error instanceof Error ? error.message : "";
      showError(
        message === "Invalid login credentials"
          ? "Credenciales inválidas. Verifica tu contraseña."
          : message || "Error al iniciar sesión.",
      );
      setLoading(false);
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLoginForm);
} else {
  initializeLoginForm();
}

document.addEventListener("astro:page-load", initializeLoginForm);
