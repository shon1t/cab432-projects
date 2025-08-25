let authToken = localStorage.getItem("authToken");

// Handle login form
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      authToken = data.authToken;
      localStorage.setItem("authToken", authToken);
      document.getElementById("message").innerText = "Login successful!";
      window.location.href = "/upload.html";
    } else {
      document.getElementById("message").innerText = "Login failed.";
    }
  });
}

// Handle upload form
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("videoFile");
    const formData = new FormData();
    formData.append("video", fileInput.files[0]);

    const res = await fetch("/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById("status").innerText = `Uploaded! File: ${data.file.filename}`;
    } else {
      document.getElementById("status").innerText = "Upload failed.";
    }
  });
}
