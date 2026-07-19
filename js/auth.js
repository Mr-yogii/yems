const Auth = (() => {
  function isLoggedIn() {
    const session = sessionStorage.getItem(CONFIG.AUTH.SESSION_KEY);
    return session === "authenticated";
  }

  function login(username, password) {
    const trimmedUser = username.trim().toLowerCase();
    if (CONFIG.AUTH.USERS) {
      const user = CONFIG.AUTH.USERS.find(
        u => u.USERNAME.toLowerCase() === trimmedUser && u.PASSWORD === password
      );
      if (user) {
        sessionStorage.setItem(CONFIG.AUTH.SESSION_KEY, "authenticated");
        sessionStorage.setItem("ems_user", user.NAME);
        return true;
      }
    }
    if (trimmedUser === CONFIG.AUTH.USERNAME.toLowerCase() && password === CONFIG.AUTH.PASSWORD) {
      sessionStorage.setItem(CONFIG.AUTH.SESSION_KEY, "authenticated");
      sessionStorage.setItem("ems_user", "Yogii");
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(CONFIG.AUTH.SESSION_KEY);
    sessionStorage.removeItem("ems_user");
    window.location.href = "index.html";
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = "index.html";
      return false;
    }
    return true;
  }

  function getUser() {
    return sessionStorage.getItem("ems_user") || "";
  }

  return { isLoggedIn, login, logout, requireAuth, getUser };
})();
