let pendingRequests = [];
const supabaseUrl = "https://ecjodjkhqryqldswsxym.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjam9kamtocXJ5cWxkc3dzeHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDM0MTYsImV4cCI6MjA5ODkxOTQxNn0.pc9_0Hm3lW8MTngDqvkmLyPgFCxxel2v0IgKyQm3xjE";

// Change your current initialization to this:
const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey,
    {
        auth: {
            storage: window.sessionStorage, // This forces the session to clear on refresh
            persistSession: true // Keep it active only for this browser tab session
        }
    }
);
const ADMIN_EMAIL = "admin@fafnir.cult";
window.addEventListener('load', async () => {
    // This ensures that whenever the page finishes loading (even after a refresh),
    // you are logged out, effectively forcing a "Visitor" view.
    await supabaseClient.auth.signOut();
});
// PASSWORD POPUP
// ===========================

const popup = document.getElementById("passwordPopup");

document.getElementById("editButton").onclick = () => {
    popup.style.display = "flex";
};

document.getElementById("closePopup").onclick = () => {
    popup.style.display = "none";
};

document.getElementById("unlockButton").onclick = async () => {
    const passwordInput = document.getElementById("password").value;
    const errorDisplay = document.getElementById("wrongPassword");

    errorDisplay.innerHTML = "Verifying...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: passwordInput
    });

    if (error) {
        errorDisplay.innerHTML = "Incorrect Password";
    } else {
        errorDisplay.innerHTML = "";
        popup.style.display = "none";
        document.getElementById("adminPanel").style.display = "block";
        loadPendingRequests();

        // --- ADD THIS LINE ---
        // This forces the cards to re-draw with the new 'true' session state
        loadMembers();
    }
};
// ===========================
// LOAD MEMBERS FROM SUPABASE
// ===========================

async function loadMembers() {
    // --- ADD THESE THREE LINES ---
    const containers = document.querySelectorAll(".memberContainer");
    containers.forEach(container => {
        container.innerHTML = ""; // This wipes the existing cards clean
    });
    // -----------------------------

    const { data, error } = await supabaseClient
        .from("members")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(addMemberCard);
}

loadMembers();

// ===========================
// CREATE MEMBER CARD
// ===========================

async function addMemberCard(member) {
    const card = document.createElement("div");
    card.className = "member";
    card.dataset.name = member.name.toLowerCase();

    // Check if user is logged in
    const { data: { session } } = await supabaseClient.auth.getSession();

    console.log("Is logged in?", !!session);

    let deleteBtnHTML = "";
    if (session) {
        deleteBtnHTML = `<button onclick="deleteMember(${member.id})" style="background:#ff4444; color:white; border:none; padding:5px; cursor:pointer; margin-top:10px;">Delete</button>`;
    }

    let avatarHTML = "";
    if (member.avatar && member.avatar.trim() != "") {
        avatarHTML = `<img src="${member.avatar}" alt="${member.name}">`;
    }

    card.innerHTML = `
        ${avatarHTML}
        <h3>${member.name}</h3>
        <p><b>Gender:</b> ${member.gender}</p>
        <p><b>Fetish:</b> ${member.fetish}</p>
        <p><b>Status:</b> ${member.status}</p>
        ${deleteBtnHTML}
    `;

    const container = document.getElementById(member.category);
    if (container) {
        container.appendChild(card);
    }
}

// ===========================
// ADD MEMBER BUTTON (DIRECT)
// ===========================
document.getElementById("addButton").onclick = async function () {
    const btn = document.getElementById("addButton");
    btn.innerText = "Adding...";
    btn.disabled = true;

    const avatarUrl = await uploadAvatar(document.getElementById("adminAvatarFile"));

    const member = {
        name: document.getElementById("name").value,
        gender: document.getElementById("gender").value,
        fetish: document.getElementById("fetish").value,
        status: document.getElementById("status").value,
        category: document.getElementById("category").value,
        avatar: avatarUrl
    };

    const { error } = await supabaseClient.from("members").insert([member]);

    if (error) {
        console.error(error);
        alert("Failed to add member.");
    } else {
        loadMembers();
        alert("Member Added directly!");
    }

    btn.innerText = "Add Member";
    btn.disabled = false;
};

// ===========================
// AVATAR UPLOAD HELPER
// ===========================
async function uploadAvatar(fileInput) {
    const file = fileInput.files[0];
    if (!file) return "";

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabaseClient.storage
        .from('avatar')
        .upload(fileName, file);

    if (error) {
        console.error("Upload error:", error);
        alert("Failed to upload image.");
        return "";
    }

    const { data: urlData } = supabaseClient.storage.from('avatar').getPublicUrl(fileName);
    return urlData.publicUrl;
}

// ===========================
// REQUEST MEMBERSHIP UI & LOGIC
// ===========================
const requestPopup = document.getElementById("requestPopup");

document.getElementById("requestButton").onclick = () => {
    requestPopup.style.display = "flex";
};

document.getElementById("closeRequestPopup").onclick = () => {
    requestPopup.style.display = "none";
};

document.getElementById("submitRequestBtn").onclick = async () => {
    const btn = document.getElementById("submitRequestBtn");
    btn.innerText = "Uploading...";
    btn.disabled = true;

    const avatarUrl = await uploadAvatar(document.getElementById("reqAvatarFile"));

    const requestData = {
        name: document.getElementById("reqName").value,
        gender: document.getElementById("reqGender").value,
        fetish: document.getElementById("reqFetish").value,
        status: document.getElementById("reqStatus").value,
        avatar: avatarUrl
    };

    const { error } = await supabaseClient.from("member_request").insert([requestData]);

    if (error) {
        console.error("Error submitting request:", error);
        alert("Failed to submit request.");
    } else {
        alert("Membership request submitted to the Cult!");
        requestPopup.style.display = "none";
    }

    btn.innerText = "Request Join";
    btn.disabled = false;
};

// ===========================
// ADMIN QUEUE LOGIC
// ===========================
let pendingApprovalData = null;

async function loadPendingRequests() {
    const queueContainer = document.getElementById("pendingQueue");
    queueContainer.innerHTML = "Loading...";

    const { data, error } = await supabaseClient.from("member_request").select("*");
    pendingRequests = data;

    if (error) {
        console.error("Error fetching requests:", error);
        queueContainer.innerHTML = "Failed to load requests.";
        return;
    }

    queueContainer.innerHTML = "";

    if (data.length === 0) {
        queueContainer.innerHTML = "<p>No pending requests.</p>";
        return;
    }

    data.forEach(req => {
        const div = document.createElement("div");
        div.style.borderBottom = "1px solid #444";
        div.style.paddingBottom = "10px";
        div.style.marginBottom = "10px";
        div.innerHTML = `
            <p><b>${req.name}</b> (${req.gender})</p>
            <p>Fetish: ${req.fetish} | Status: ${req.status}</p>
            ${req.avatar ? `<a href="${req.avatar}" target="_blank" style="color:#00ffcc;">View Avatar</a>` : `No Avatar`}
            <br><br>
           <button onclick="openApproveModalById(${req.id})">Approve</button>
            <button onclick='rejectRequest(${req.id})'>Reject</button>
        `;
        queueContainer.appendChild(div);
    });
}

window.openApproveModalById = function (id) {

    pendingApprovalData =
        pendingRequests.find(r => r.id === id);

    document.getElementById("approvePopup").style.display = "flex";

};

document.getElementById("cancelApproveBtn").onclick = () => {
    document.getElementById("approvePopup").style.display = "none";
    pendingApprovalData = null;
};

document.getElementById("confirmApproveBtn").onclick = async () => {
    if (!pendingApprovalData) return;

    const finalMember = {
        name: pendingApprovalData.name,
        gender: pendingApprovalData.gender,
        fetish: pendingApprovalData.fetish,
        status: pendingApprovalData.status,
        avatar: pendingApprovalData.avatar,
        category: document.getElementById("approveCategory").value
    };

    const { error: insertError } = await supabaseClient.from("members").insert([finalMember]);

    if (insertError) {
        console.error("Approval error:", insertError);
        alert("Failed to approve member.");
        return;
    }

    await supabaseClient.from("member_request").delete().eq("id", pendingApprovalData.id);

    document.getElementById("approvePopup").style.display = "none";
    pendingApprovalData = null;
    loadPendingRequests();
    loadMembers();
    alert("Member Approved and Added!");
};

window.rejectRequest = async function (id) {
    if (!confirm("Are you sure you want to reject this request?")) return;

    const { error } = await supabaseClient.from("member_request").delete().eq("id", id);

    if (error) {
        console.error("Reject error:", error);
    } else {
        loadPendingRequests();
    }
};
// Add this at the end of members.js
window.deleteMember = async function (id) {
    if (!confirm("Are you sure you want to delete this member?")) return;

    const { error } = await supabaseClient.from("members").delete().eq("id", id);

    if (error) {
        alert("Error deleting member: " + error.message);
    } else {
        alert("Member deleted.");
        loadMembers(); // Refreshes the list to remove the card
    }
};
// Add this to your members.js
window.logoutAdmin = async function () {
    await supabaseClient.auth.signOut(); // This deletes the token from storage
    alert("Logged out!");
    location.reload(); // Now refresh
};
window.approveRequest = function (id, name, gender, fetish, status, avatar) {
    console.log("Approve button clicked for:", name); // Debugging
    pendingApprovalData = { id, name, gender, fetish, status, avatar };
    document.getElementById("approvePopup").style.display = "flex";
    document.getElementById("approveNameDisplay").innerText = name;
};
document.getElementById("searchButton").onclick = function(){

    const search = document
        .getElementById("memberSearch")
        .value
        .trim()
        .toLowerCase();

    const cards = document.querySelectorAll(".member");

    let matches = 0;
    let lastMatch = null;

    cards.forEach(card=>{

        card.classList.remove("memberHighlight");

        const name = card.dataset.name.toLowerCase();

        if(name.includes(search) && search !== ""){

            matches++;

            lastMatch = card;

            card.classList.add("memberHighlight");

        }

    });

    document.getElementById("searchCount").innerHTML =
        matches + (matches === 1 ? " result found" : " results found");

    // Auto-scroll only when exactly ONE result exists
if(matches === 1){

    window.lastSearchMatch = lastMatch;

}else{

    window.lastSearchMatch = null;

}

};
let searchTimeout;

document.getElementById("memberSearch").addEventListener("input", function(){

    document.getElementById("searchButton").click();

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(()=>{

        if(window.lastSearchMatch){

            window.lastSearchMatch.scrollIntoView({

                behavior:"smooth",
                block:"center"

            });

        }

    },850);

});