// Toggle between Login and Sign Up tabs
const showLoginBtn = document.getElementById("show-login-btn");
const showSignupBtn = document.getElementById("show-signup-btn");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

if (showLoginBtn && showSignupBtn) {
    showLoginBtn.addEventListener("click", () => {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
        showLoginBtn.classList.add("active");
        showSignupBtn.classList.remove("active");
    });

    showSignupBtn.addEventListener("click", () => {
        signupForm.style.display = "block";
        loginForm.style.display = "none";
        showSignupBtn.classList.add("active");
        showLoginBtn.classList.remove("active");
    });
}
