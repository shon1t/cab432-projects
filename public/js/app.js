let authToken = localStorage.getItem("authToken");

// Handle login form
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      authToken = data.authToken;
      localStorage.setItem("authToken", authToken);
      document.getElementById("message").innerText = "Login successful!";
      window.location.href = "/video";
    } else {
      document.getElementById("message").innerText = "Login failed.";
    }
  });
}

// Handle upload form
const uploadForm = document.getElementById("uploadForm");
const downloadLink = document.getElementById("downloadLink");

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("videoFile");
    const formatSelect = document.getElementById("format");
    const format = formatSelect.value;

    const formData = new FormData();
    formData.append("video", fileInput.files[0]);

    // Upload video
    const uploadRes = await fetch("/video/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      document.getElementById("status").innerText = "Upload failed.";
      return;
    }
    
    const uploadData = await uploadRes.json();
    const filename = uploadData.file.filename;

    // transcode
    const transcodeRes = await fetch("/video/transcode", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ filename, format }),
    });

    if (transcodeRes.ok) {
      const transcodeData = await transcodeRes.json();
      document.getElementById("status").innerText = "Transcoding complete!";
      document.getElementById("downloadLink").innerHTML = `<a href="${transcodeData.output}" download>Download Video</a>`;
      } else {
        document.getElementById("status").innerText = "Transcoding failed.";
      }
    });
}

// Handle admin button 
const adminButton = document.getElementById("adminButton");

if (adminButton) {
  adminButton.addEventListener("click", async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in first.");
      return;
    }

    try {
      const buttonRes = await fetch("/admin", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (buttonRes.ok) {
        const html = await buttonRes.text();

        document.open();
        document.write(html);
        document.close();

      } else if (buttonRes.status === 403) {
        alert("Forbidden — only admins can access this page.");
      } else if (buttoneRes.status === 401){
        alert("Your session has expired ot your token is invalid.")
      }
    } catch (error) {
      console.error("Error accessing admin page:", error);
      alert("An error occurred while trying to access the admin page.");
    }
  });
}

// Handle logout button
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    // Remove the JWT from localStorage
    localStorage.removeItem("authToken");

    // Optionally clear any UI elements or status messages
    document.getElementById("status").innerText = "";

    // Redirect user to login page
    window.location.href = "/";
  });
}
