// SpendSmart Authentication

async function getCsrfToken() {
    const response = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "same-origin"
    });

    if (!response.ok) {
        throw new Error("Unable to initialize security token.");
    }

    const data = await response.json();
    return data.token;
}

async function sendAuthRequest(url, payload) {
    const token = await getCsrfToken();

    return fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": token
        },
        body: JSON.stringify(payload)
    });
}

async function readResponse(response) {
    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || `Request failed (${response.status})`
        );
    }

    return result;
}


// LOGIN

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const button = document.getElementById("loginButton");
        const message = document.getElementById("authMessage");

        button.disabled = true;
        button.textContent = "Signing in...";
        message.textContent = "";

        try {
            const response = await sendAuthRequest(
                "/api/auth/login",
                { email, password }
            );

            await readResponse(response);

            message.style.color = "green";
            message.textContent = "Login successful! Redirecting...";

            window.location.href = "/";

        } catch (error) {
            message.style.color = "red";
            message.textContent = error.message;

        } finally {
            button.disabled = false;
            button.textContent = "Sign In";
        }
    });
}


// REGISTRATION

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const button = document.getElementById("registerButton");
        const message = document.getElementById("authMessage");

        button.disabled = true;
        button.textContent = "Creating account...";
        message.textContent = "";

        try {
            const response = await sendAuthRequest(
                "/api/auth/register",
                { name, email, password }
            );

            await readResponse(response);

            message.style.color = "green";
            message.textContent =
                "Account created successfully! Redirecting to login...";

            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1500);

        } catch (error) {
            message.style.color = "red";
            message.textContent = error.message;

        } finally {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    });
}


document.addEventListener("DOMContentLoaded", () => {

    const passwordForm = document.getElementById("changePasswordForm");

    if (!passwordForm) return;

    const currentPassword =
        document.getElementById("currentPassword");

    const newPassword =
        document.getElementById("newPassword");

    const confirmNewPassword =
        document.getElementById("confirmNewPassword");

    const passwordMessage =
        document.getElementById("passwordMessage");

    const changeButton =
        document.getElementById("changePasswordButton");

    function getCsrfToken() {
        const cookie = document.cookie
            .split("; ")
            .find(row => row.startsWith("XSRF-TOKEN="));

        return cookie
            ? decodeURIComponent(cookie.substring("XSRF-TOKEN=".length))
            : null;
    }

    passwordForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const current = currentPassword.value;
        const newPass = newPassword.value;
        const confirmPass = confirmNewPassword.value;

        passwordMessage.textContent = "";
        passwordMessage.style.color = "";

        if (newPass.length < 8) {
            passwordMessage.textContent =
                "New password must contain at least 8 characters.";
            passwordMessage.style.color = "red";
            return;
        }

        if (newPass !== confirmPass) {
            passwordMessage.textContent =
                "New passwords do not match.";
            passwordMessage.style.color = "red";
            return;
        }

        if (current === newPass) {
            passwordMessage.textContent =
                "New password must be different from current password.";
            passwordMessage.style.color = "red";
            return;
        }

        const csrfToken = getCsrfToken();

        if (!csrfToken) {
            passwordMessage.textContent =
                "Security token missing. Refresh the page and try again.";
            passwordMessage.style.color = "red";
            return;
        }

        changeButton.disabled = true;
        changeButton.textContent = "Updating...";

        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": csrfToken
                },
                body: JSON.stringify({
                    currentPassword: current,
                    newPassword: newPass
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to update password."
                );
            }

            passwordMessage.textContent =
                "Password changed successfully!";
            passwordMessage.style.color = "green";

            passwordForm.reset();

        } catch (error) {
            passwordMessage.textContent = error.message;
            passwordMessage.style.color = "red";

        } finally {
            changeButton.disabled = false;
            changeButton.textContent = "Update Password";
        }
    });
});
