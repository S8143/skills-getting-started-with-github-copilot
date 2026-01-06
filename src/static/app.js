document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Create participant list item with delete handler
  function createParticipantListItem(activityName, email) {
    const li = document.createElement('li');
    li.className = 'participant-name';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = email;

    const delBtn = document.createElement('button');
    delBtn.className = 'participant-delete';
    delBtn.title = `Unregister ${email}`;
    delBtn.setAttribute('aria-label', `Unregister ${email}`);
    delBtn.innerHTML = '✖';

    delBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
          { method: 'POST' }
        );

        const result = await response.json();

        if (response.ok) {
          li.remove();

          // Update availability and empty state in the card
          const cards = activitiesList.querySelectorAll('.activity-card');
          cards.forEach((card) => {
            const title = card.querySelector('h4');
            if (title && title.textContent === activityName) {
              const ul = card.querySelector('.participants-list');
              const participantsSection = card.querySelector('.participants-section');

              if (!ul || ul.children.length === 0) {
                const emptyP = document.createElement('p');
                emptyP.className = 'empty-participants';
                emptyP.textContent = 'No participants yet.';
                if (ul) participantsSection.replaceChild(emptyP, ul);
                else participantsSection.appendChild(emptyP);
              }

              // Increment availability (we removed a participant)
              const availabilityP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.includes('Availability:'));
              if (availabilityP) {
                const match = availabilityP.textContent.match(/(\d+)\s+spots left/);
                if (match) {
                  availabilityP.innerHTML = `<strong>Availability:</strong> ${parseInt(match[1]) + 1} spots left`;
                }
              }
            }
          });

          messageDiv.textContent = result.message;
          messageDiv.className = 'message info';
          messageDiv.classList.remove('hidden');
          setTimeout(() => messageDiv.classList.add('hidden'), 5000);
        } else {
          messageDiv.textContent = result.detail || 'An error occurred';
          messageDiv.className = 'message error';
          messageDiv.classList.remove('hidden');
          setTimeout(() => messageDiv.classList.add('hidden'), 5000);
        }
      } catch (error) {
        messageDiv.textContent = 'Failed to unregister. Please try again.';
        messageDiv.className = 'message error';
        messageDiv.classList.remove('hidden');
        console.error('Error unregistering:', error);
      }
    });

    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    return li;
  }

  // Update a specific activity card immediately after signup
  function addParticipantToActivityUI(activityName, email) {
    const cards = activitiesList.querySelectorAll('.activity-card');
    for (const card of cards) {
      const title = card.querySelector('h4');
      if (title && title.textContent === activityName) {
        const participantsSection = card.querySelector('.participants-section');
        let ul = participantsSection.querySelector('.participants-list');
        if (!ul) {
          const emptyP = participantsSection.querySelector('.empty-participants');
          ul = document.createElement('ul');
          ul.className = 'participants-list';
          if (emptyP) participantsSection.replaceChild(ul, emptyP);
          else participantsSection.appendChild(ul);
        }
        ul.appendChild(createParticipantListItem(activityName, email));

        // decrement availability
        const availabilityP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.includes('Availability:'));
        if (availabilityP) {
          const match = availabilityP.textContent.match(/(\d+)\s+spots left/);
          if (match) availabilityP.innerHTML = `<strong>Availability:</strong> ${Math.max(0, parseInt(match[1]) - 1)} spots left`;
        }

        break;
      }
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants?.length || 0);

        // Basic activity info
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = "Participants";
        participantsSection.appendChild(participantsHeader);

        if (!details.participants || details.participants.length === 0) {
          const emptyP = document.createElement("p");
          emptyP.className = "empty-participants";
          emptyP.textContent = "No participants yet.";
          participantsSection.appendChild(emptyP);
        } else {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          details.participants.forEach((p) => {
            ul.appendChild(createParticipantListItem(name, p));
          });
          participantsSection.appendChild(ul);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Update UI immediately for the activity and refresh in background
        addParticipantToActivityUI(activity, email);
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
