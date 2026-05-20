const apiBase = 'http://localhost:5001';
let currentUserId = localStorage.getItem('currentUserId') || '';

const statusEl = document.getElementById('status') || document.getElementById('feedStatus') || document.getElementById('profileStatus');

function setStatus(message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  setTimeout(() => {
    statusEl.textContent = '';
  }, 4000);
}

async function registerUser(event) {
  event.preventDefault();
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();

  if (!username || !email || !password) {
    setStatus('Please fill out all registration fields.');
    return;
  }

  const response = await fetch(`${apiBase}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(data.error || 'Registration failed');
    return;
  }

  currentUserId = data.id;
  localStorage.setItem('currentUserId', currentUserId);
  setStatus('Account created. You are now logged in.');
  window.location.href = 'feed.html';
}

async function loginUser(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!email || !password) {
    setStatus('Please fill out both login fields.');
    return;
  }

  const response = await fetch(`${apiBase}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(data.error || 'Login failed');
    return;
  }

  currentUserId = data.user.id;
  localStorage.setItem('currentUserId', currentUserId);
  setStatus('Logged in successfully.');
  window.location.href = 'feed.html';
}

async function createPost() {
  const content = document.getElementById('postContent')?.value.trim();
  if (!content) {
    setStatus('Share something before posting.');
    return;
  }
  if (!currentUserId) {
    setStatus('Please login or register first.');
    return;
  }

  const response = await fetch(`${apiBase}/create-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId, content }),
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(data.error || 'Unable to create post');
    return;
  }

  document.getElementById('postContent').value = '';
  setStatus('Post shared successfully.');
  loadFeed();
}

async function likePost(postId) {
  const response = await fetch(`${apiBase}/like/${postId}`, { method: 'PUT' });
  const data = await response.json();
  if (!response.ok) {
    setStatus(data.error || 'Could not like post');
    return;
  }
  setStatus('Post liked');
  loadFeed();
}

async function addComment(postId) {
  const text = prompt('Add a comment');
  if (!text || !text.trim()) {
    return;
  }
  if (!currentUserId) {
    setStatus('Please login or register first.');
    return;
  }

  const response = await fetch(`${apiBase}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, userId: currentUserId, text: text.trim() }),
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(data.error || 'Could not save comment');
    return;
  }
  setStatus('Comment added');
  loadFeed();
}

async function uploadProfileImage() {
  const fileInput = document.getElementById('profileImageInput');
  const file = fileInput?.files[0];
  
  if (!file) {
    setStatus('Please select an image first.');
    return;
  }

  if (!currentUserId) {
    setStatus('Please login first.');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const imageData = e.target.result;
    const response = await fetch(`${apiBase}/user/${currentUserId}/profile-image`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData }),
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || 'Failed to upload image');
      return;
    }

    setStatus('Profile photo updated successfully.');
    fileInput.value = '';
    loadProfile();
  };
  reader.readAsDataURL(file);
}

async function followSuggestedUser(targetId) {
  if (!currentUserId) {
    setStatus('Please login or register first.');
    return;
  }

  const response = await fetch(`${apiBase}/follow/${targetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followerId: currentUserId }),
  });
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Unable to follow user');
    return;
  }

  setStatus('User followed successfully.');
  loadProfile();
}

async function loadFeed() {
  const feedSection = document.getElementById('feed');
  if (!feedSection) return;

  const response = await fetch(`${apiBase}/posts`);
  const data = await response.json();
  if (!response.ok) {
    feedSection.innerHTML = '<p>Could not load feed.</p>';
    return;
  }

  const commentsByPost = data.comments.reduce((acc, comment) => {
    acc[comment.postId] = acc[comment.postId] ? acc[comment.postId] + 1 : 1;
    return acc;
  }, {});

  feedSection.innerHTML = await Promise.all(data.posts.map(async (post) => {
    const author = post.userId ? post.userId.username : 'Unknown';
    const commentCount = commentsByPost[post._id] || 0;
    
    const commentsResponse = await fetch(`${apiBase}/comments/post/${post._id}`);
    const comments = commentsResponse.ok ? await commentsResponse.json() : [];
    
    const commentsHtml = comments.map(comment => `
      <div class="comment-item">
        <strong>${comment.userId.username}</strong>
        <p>${comment.text}</p>
        <span>${new Date(comment.createdAt).toLocaleString()}</span>
      </div>
    `).join('');

    return `
      <article class="post-card">
        <div class="post-header">
          <div class="post-avatar">${author.charAt(0).toUpperCase()}</div>
          <div>
            <h4>${author}</h4>
            <span>${new Date(post.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div class="post-body">
          <p class="post-content">${post.content}</p>
          <div class="post-actions">
            <button onclick="likePost('${post._id}')">❤️ ${post.likes}</button>
            <button onclick="addComment('${post._id}')">💬 ${commentCount}</button>
          </div>
          ${comments.length > 0 ? `
            <div class="post-comments-section">
              <div class="comments-header">Comments</div>
              ${commentsHtml}
            </div>
          ` : ''}
        </div>
      </article>
    `;
  })).then(results => results.join(''));
}

async function loadProfile() {
  const profileDetails = document.getElementById('profileDetails');
  const profilePosts = document.getElementById('profilePosts');
  const profileHeader = document.getElementById('profileHeader');
  const followButton = document.getElementById('followButton');
  if (!profileDetails || !profilePosts || !profileHeader) return;

  if (!currentUserId) {
    profileHeader.innerHTML = '<p>Please login or register to view your profile.</p>';
    profileDetails.innerHTML = '';
    profilePosts.innerHTML = '';
    if (followButton) followButton.style.display = 'none';
    return;
  }

  const response = await fetch(`${apiBase}/user/${currentUserId}`);
  const data = await response.json();

  if (!response.ok) {
    profileHeader.innerHTML = '<p>Unable to load profile.</p>';
    return;
  }

  const profileImage = data.user.profileImage
    ? `<img src="${data.user.profileImage}" alt="Profile" class="profile-avatar-img"/>`
    : `<div class="profile-avatar">${data.user.username.charAt(0).toUpperCase()}</div>`;
  
  profileHeader.innerHTML = `
    ${profileImage}
    <div>
      <h2>${data.user.username}</h2>
      <p>${data.user.bio || 'New to HorizonTechX. Share your first post!'}</p>
    </div>
  `;

  profileDetails.innerHTML = `
    <p><strong>Posts:</strong> ${data.posts.length}</p>
    <p><strong>Followers:</strong> ${data.user.followers.length}</p>
    <p><strong>Following:</strong> ${data.user.following.length}</p>
    <p><strong>Joined:</strong> ${new Date(data.user.createdAt).toLocaleDateString()}</p>
  `;

  profilePosts.innerHTML = data.posts.length
    ? data.posts.map(post => `
      <article class="post-card">
        <div class="post-body">
          <p class="post-content">${post.content}</p>
          <small>${post.likes} likes • ${new Date(post.createdAt).toLocaleDateString()}</small>
        </div>
      </article>
    `).join('')
    : '<p>No posts yet. Share your first moment!</p>';

  if (followButton) {
    followButton.style.display = 'block';
    followButton.textContent = 'Follow a suggestion';
  }
}

async function loadStoriesAndSuggestions() {
  const storyStrip = document.getElementById('storyStrip');
  const suggestions = document.getElementById('suggestions');
  if (!storyStrip && !suggestions) return;

  const response = await fetch(`${apiBase}/users`);
  const data = await response.json();
  if (!response.ok) return;

  if (storyStrip) {
    storyStrip.innerHTML = data.slice(0, 6).map(user => `
      <div class="story-item">
        <div class="story-avatar">${user.username.charAt(0).toUpperCase()}</div>
        <span>${user.username}</span>
      </div>
    `).join('');
  }

  if (suggestions) {
    suggestions.innerHTML = data.slice(0, 4).map(user => `
      <div class="suggestion-item">
        <div class="suggestion-avatar">${user.username.charAt(0).toUpperCase()}</div>
        <div>
          <strong>${user.username}</strong>
          <p>${user.bio || 'No bio yet.'}</p>
        </div>
        <button onclick="followSuggestedUser('${user._id}')">Follow</button>
      </div>
    `).join('');
  }
}

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
if (registerForm) registerForm.addEventListener('submit', registerUser);
if (loginForm) loginForm.addEventListener('submit', loginUser);

const createPostButton = document.getElementById('createPostButton');
if (createPostButton) createPostButton.addEventListener('click', createPost);

const uploadImageButton = document.getElementById('uploadImageButton');
if (uploadImageButton) uploadImageButton.addEventListener('click', uploadProfileImage);

loadStoriesAndSuggestions();
loadFeed();
loadProfile();
