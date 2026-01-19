
// =========================================
// LOGOUT FUNCTION
// =========================================

function logout() {
    // Clear session and redirect to login
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin'
    })
        .then(response => {
            if (response.ok) {
                window.location.href = '/login';
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Force redirect even if request fails
            window.location.href = '/login';
        });
}
