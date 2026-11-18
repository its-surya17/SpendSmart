
document.addEventListener("DOMContentLoaded", async () => {

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileAvatar = document.getElementById("profileAvatar");
    const logoutButton = document.getElementById("logoutButton");

    // Read CSRF token from the browser cookie
    function getCsrfToken() {
        const cookies = document.cookie.split(";");

        for (const cookie of cookies) {
            const trimmedCookie = cookie.trim();

            if (trimmedCookie.startsWith("XSRF-TOKEN=")) {
                return decodeURIComponent(
                    trimmedCookie.substring("XSRF-TOKEN=".length)
                );
            }
        }

        return null;
    }

    // Load authenticated user's information
    async function loadUserProfile() {
        try {
            const response = await fetch("/api/auth/me", {
                method: "GET",
                credentials: "same-origin"
            });

            if (response.status === 401 || response.status === 403) {
                window.location.replace("/login.html");
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to load profile");
            }

            const user = await response.json();

            if (profileName) {
                profileName.textContent = user.name;
            }

            if (profileEmail) {
                profileEmail.textContent = user.email;
            }

            if (profileAvatar) {
                profileAvatar.textContent =
                    user.name.trim().charAt(0).toUpperCase();
            }

        } catch (error) {
            console.error("Profile loading error:", error);

            if (profileName) {
                profileName.textContent = "Profile unavailable";
            }

            if (profileEmail) {
                profileEmail.textContent = "";
            }
        }
    }

    // Logout
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {

            const confirmed = confirm(
                "Are you sure you want to log out?"
            );

            if (!confirmed) return;

            logoutButton.disabled = true;
            logoutButton.textContent = "Logging out...";

            try {
                const csrfToken = getCsrfToken();

                if (!csrfToken) {
                    throw new Error(
                        "CSRF token missing. Refresh the page and try again."
                    );
                }

                const response = await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "X-XSRF-TOKEN": csrfToken
                    }
                });

                if (!response.ok) {
                    throw new Error(
                        "Logout failed with status: " + response.status
                    );
                }

                window.location.replace("/login.html");

            } catch (error) {
                console.error("Logout error:", error);

                alert(error.message || "Unable to log out. Please try again.");

                logoutButton.disabled = false;
                logoutButton.textContent = "Logout";
            }
        });
    }

    await loadUserProfile();

});
