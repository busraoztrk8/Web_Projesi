/* ../src/todolist.js */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    console.log("todolist.js: Initializing DB-Connected Weekly Planner...");

    // --- DOM Element Selection ---
    const daysGridContainer = document.getElementById('days-grid-container');
    if (!daysGridContainer) {
        console.error("Fatal Error: Days grid container (#days-grid-container) not found.");
        return;
    }

    // --- Constants ---
    const API_URL = '/api/weekly-planner'; // Backend API endpoint'i (TEMEL URL)
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // --- State ---
    let tasksByDay = {};
    DAYS.forEach(day => { tasksByDay[day] = []; });

    // --- Helper Functions ---
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = String(str ?? '');
        return div.innerHTML;
     };

    /**
     * Kullanıcı ID'sini localStorage'dan alır.
     * @returns {string | null} - Kullanıcı ID'si veya bulunamazsa null.
     */
    const getUserId = () => {
        // BURAYI DEĞİŞTİRİN: 'user_id' yerine 'userId' kullanın
        const userId = localStorage.getItem('userId'); // <-- Değişiklik burada!
        // DEĞİŞİKLİK SONU

        if (!userId) {
            console.error("User ID not found in localStorage. Redirecting to login.");
            // Kullanıcı giriş yapmamışsa veya ID kaybolmuşsa login'e yönlendir
            alert("Lütfen tekrar giriş yapınız."); // Bilgilendirme
            // BURAYI DA KONTROL EDİN: Login sayfanızın doğru yolu ne? /login.html mi /public/login.html mi?
            // Eğer login.html de /public altında ise burayı /public/login.html yapmalısınız.
            // app.js'deki yönlendirme /public/index.html ise, login.html'in de /public altında olması muhtemeldir.
            window.location.href = '/public/login.html'; // <-- Login sayfası yolu da /public altında olabilir
        }
        return userId;
    };

    // --- API Interaction Helper ---
    const apiRequest = async (url, options = {}) => {
        const userId = getUserId();
        if (!userId) {
            throw new Error("Kimlik doğrulama gerekli. Lütfen giriş yapın.");
        }

        const headers = {
            'Content-Type': 'application/json',
            'X-User-ID': userId,
            ...(options.headers || {})
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                console.error("API returned 401 Unauthorized. Redirecting to login.");
                localStorage.removeItem('userId'); // 'user_id' yerine 'userId' temizleyin
                localStorage.removeItem('username'); // 'loggedInUser' yerine 'username' temizleyin
                alert("Oturumunuz sonlanmış veya geçersiz. Lütfen tekrar giriş yapın.");
                // BURAYI DA KONTROL EDİN: /login.html yerine /public/login.html
                window.location.href = '/public/login.html'; // <-- Login sayfası yolu da /public altında olabilir
                return Promise.reject(new Error("Unauthorized (401)"));
            }

            if (!response.ok) {
                let errorData = { message: `Sunucu hatası: ${response.status}` };
                try {
                    errorData = await response.json();
                } catch (e) {
                     console.warn("API error response was not valid JSON or body was empty.");
                     if (response.status === 204 && options.method === 'DELETE') {
                        return {};
                     }
                }
                throw new Error(errorData.message || `API isteği başarısız: ${response.status}`);
            }

            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return {};
            }

            return await response.json();

        } catch (error) {
            if (error.message !== "Unauthorized (401)") {
                 console.error(`API Request Failed: ${options.method || 'GET'} ${url}`, error);
                 throw error;
             }
             return Promise.reject(error);
        }
    };

    // --- DOM Manipulation & Rendering ---
    const toggleNoTasksPlaceholder = (day, taskListElement) => {
        const placeholder = taskListElement?.parentElement?.querySelector('.no-tasks-placeholder');
        if (!placeholder) return;
        const tasksForDay = tasksByDay[day] || [];
        const hasTasks = tasksForDay.length > 0;

        placeholder.style.display = hasTasks ? 'none' : 'flex';
        placeholder.classList.toggle('visible', !hasTasks);
    };

    const createTaskElement = (task) => {
        const li = document.createElement('li');
        li.dataset.taskId = task.id;
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        const safeText = escapeHtml(task.text);

        li.innerHTML = `
            <div class="task-content" role="button" tabindex="0" aria-label="${safeText} görevini düzenle/tamamla">
                <input type="checkbox" class="task-checkbox" aria-label="Görevi tamamla" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${safeText}</span>
            </div>
            <div class="edit-task-input-container">
                 <input type="text" class="edit-task-input" value="${safeText}" aria-label="Görevi düzenle">
                 <div class="edit-actions">
                    <button class="save-edit-button button icon-button success" aria-label="Değişiklikleri Kaydet"><i class="fas fa-check"></i></button>
                    <button class="cancel-edit-button button icon-button cancel" aria-label="İptal Et"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-task-button button icon-button" aria-label="Görevi Düzenle"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-task-button button icon-button danger" aria-label="Görevi Sil"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        return li;
    };

    const renderTaskList = (day, taskListElement, animateNewTaskId = null) => {
        if (!taskListElement) return;
        taskListElement.innerHTML = '';

        const tasksForDay = tasksByDay[day] || [];
        const activeTasks = tasksForDay.filter(t => !t.completed);
        const completedTasks = tasksForDay.filter(t => t.completed);

        const fragment = document.createDocumentFragment();

        [...activeTasks, ...completedTasks].forEach(task => {
             if (task && typeof task.id !== 'undefined') {
                const newLi = createTaskElement(task);
                if (animateNewTaskId && String(task.id) === String(animateNewTaskId)) {
                    newLi.classList.add('newly-added');
                    newLi.addEventListener('animationend', () => { newLi.classList.remove('newly-added'); }, { once: true });
                     setTimeout(() => newLi.classList.remove('newly-added'), 500);
                }
                fragment.appendChild(newLi);
            } else {
                 console.warn("Skipping task rendering due to missing/invalid ID:", task);
            }
        });

        taskListElement.appendChild(fragment);
        toggleNoTasksPlaceholder(day, taskListElement);
    };

    const renderAllLists = () => {
        console.log("Rendering all lists based on current state...", tasksByDay);
        DAYS.forEach(day => {
            const taskListElement = daysGridContainer.querySelector(`.day-column[data-day="${day}"] .task-list`);
            if (taskListElement) {
                renderTaskList(day, taskListElement);
            } else {
                console.warn(`Task list element not found for day: ${day}`);
            }
        });
    };

    // --- Task Operations (API Calls) ---
    const loadTasks = async () => {
        console.log("Attempting to load tasks from API...");
        daysGridContainer.style.opacity = '0.5';
        daysGridContainer.style.pointerEvents = 'none';

        try {
            const data = await apiRequest(API_URL);
            tasksByDay = data || {};
            DAYS.forEach(day => {
                if (!tasksByDay[day]) { tasksByDay[day] = []; }
                 (tasksByDay[day] || []).forEach(task => {
                     if (typeof task.id === 'undefined') {
                         console.warn(`Task loaded from API for day ${day} has missing ID:`, task);
                     }
                 });
            });
            renderAllLists();
            console.log("Tasks loaded successfully.", JSON.parse(JSON.stringify(tasksByDay)));
        } catch (error) {
             if (error.message !== "Unauthorized (401)") {
                console.error("Failed to load tasks:", error);
                alert(`Görevler yüklenirken bir hata oluştu: ${error.message}`);
                 tasksByDay = {};
                 DAYS.forEach(day => { tasksByDay[day] = []; });
                 renderAllLists();
            }
        } finally {
            daysGridContainer.style.opacity = '1';
            daysGridContainer.style.pointerEvents = 'auto';
        }
    };

    const addTask = async (day, taskText) => {
        const trimmedText = taskText.trim();
        if (!trimmedText || !day) return;

        console.log(`Adding task to ${day} via API: "${trimmedText}"`);
        const form = daysGridContainer.querySelector(`.day-column[data-day="${day}"] form`);
        const addButton = form?.querySelector('.add-task-button');
        const input = form?.querySelector('.new-task-input');
        if(addButton) addButton.disabled = true;

        try {
            const newTaskDataFromApi = await apiRequest(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    gun: day,
                    gorev_metni: trimmedText
                })
            });

             if (!newTaskDataFromApi || typeof newTaskDataFromApi.id === 'undefined') {
                 console.error("API did not return a valid new task object with an ID.", newTaskDataFromApi);
                 throw new Error("Sunucudan geçersiz görev yanıtı alındı.");
             }

            if (!tasksByDay[day]) { tasksByDay[day] = []; }
            tasksByDay[day].unshift(newTaskDataFromApi);

            const taskListElement = daysGridContainer.querySelector(`.day-column[data-day="${day}"] .task-list`);
            renderTaskList(day, taskListElement, newTaskDataFromApi.id);

            console.log(`Task added successfully via API. ID: ${newTaskDataFromApi.id}`);
            if(input) input.value = '';

        } catch (error) {
             if (error.message !== "Unauthorized (401)") {
                console.error(`Failed to add task to ${day}:`, error);
                alert(`Görev eklenemedi: ${error.message}`);
            }
        } finally {
             if (input) handleNewTaskInput({ target: input });
        }
    };

    const deleteTask = async (taskId, day) => {
        if (!taskId || !day) return;

        console.log(`Attempting to delete task ID ${taskId} from ${day} via API...`);
        const taskListElement = daysGridContainer.querySelector(`.day-column[data-day="${day}"] .task-list`);
        const liElement = taskListElement?.querySelector(`li.task-item[data-task-id="${taskId}"]`);

        if (liElement) {
            liElement.classList.add('removing');
            liElement.style.pointerEvents = 'none';
        } else {
            console.warn(`Task element ID ${taskId} not found in DOM for deletion animation.`);
        }

        try {
            await apiRequest(`${API_URL}/${taskId}`, { method: 'DELETE' });

            const taskIndex = tasksByDay[day]?.findIndex(t => String(t.id) === String(taskId));
            if (taskIndex > -1) {
                tasksByDay[day].splice(taskIndex, 1);
                 console.log(`Task ID ${taskId} deleted successfully from state.`);
                 if (liElement) {
                     liElement.addEventListener('transitionend', () => {
                          console.log(`Rendering list for ${day} after delete animation.`);
                          renderTaskList(day, taskListElement);
                     }, { once: true });
                      setTimeout(() => {
                          if (liElement.parentNode) {
                             console.warn(`Delete transitionend fallback triggered for task ${taskId}. Rendering list.`);
                             renderTaskList(day, taskListElement);
                          }
                     }, 400);
                 } else {
                     renderTaskList(day, taskListElement);
                 }
            } else {
                 console.warn(`Task ID ${taskId} was not found in state for day ${day} after successful API delete.`);
                 if(liElement) { liElement.remove(); }
                 renderTaskList(day, taskListElement);
            }

        } catch (error) {
            if (error.message !== "Unauthorized (401)") {
                console.error(`Failed to delete task ID ${taskId}:`, error);
                alert(`Görev silinemedi: ${error.message}`);
                if (liElement) {
                    liElement.classList.remove('removing');
                     liElement.style.pointerEvents = 'auto';
                }
            }
        }
    };

    const updateTask = async (taskId, day, updates) => {
        if (!taskId || !day || !updates || Object.keys(updates).length === 0) return;

        const taskIndex = tasksByDay[day]?.findIndex(t => String(t.id) === String(taskId));
        if (taskIndex === undefined || taskIndex < 0) {
            console.error(`Task ID ${taskId} not found in state for day ${day}. Cannot update.`);
            return;
        }

        console.log(`Attempting optimistic UI update for task ID ${taskId}:`, updates);

        const stateUpdates = {};
        if ('gorev_metni' in updates) { stateUpdates.text = updates.gorev_metni; }
        if ('tamamlandi' in updates) { stateUpdates.completed = updates.tamamlandi; }

        const originalTask = { ...tasksByDay[day][taskIndex] };
        Object.assign(tasksByDay[day][taskIndex], stateUpdates);
        const taskListElement = daysGridContainer.querySelector(`.day-column[data-day="${day}"] .task-list`);
        renderTaskList(day, taskListElement);

        try {
            console.log(`Sending PUT request to API for task ID ${taskId}:`, updates);
            await apiRequest(`${API_URL}/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            console.log(`Task ID ${taskId} updated successfully via API.`);

        } catch (error) {
            if (error.message !== "Unauthorized (401)") {
                console.error(`Failed to update task ID ${taskId}:`, error);
                alert(`Görev güncellenemedi: ${error.message}`);
                console.log(`Reverting optimistic UI update for task ID ${taskId}.`);
                tasksByDay[day][taskIndex] = originalTask;
                renderTaskList(day, taskListElement);
            }
        }
    };

    // --- Edit Mode (UI Only, saving triggers updateTask) ---
    const enterEditMode = (taskItemLi) => {
        if (!taskItemLi || taskItemLi.classList.contains('completed') || taskItemLi.classList.contains('editing')) {
            return;
        }
        console.log(`Entering edit mode for task ID ${taskItemLi.dataset.taskId}`);
        taskItemLi.classList.add('editing');
        const editInput = taskItemLi.querySelector('.edit-task-input');
        const textSpan = taskItemLi.querySelector('.task-text');

        if (editInput && textSpan) {
             editInput.value = textSpan.textContent.trim();
            editInput.focus();
            editInput.select();
        } else {
             console.error("Could not find edit input or text span for edit mode.", taskItemLi);
             taskItemLi.classList.remove("editing");
        }
    };

    const exitEditMode = (taskItemLi, saveChanges = false) => {
        if (!taskItemLi || !taskItemLi.classList.contains('editing')) return;

        const taskId = taskItemLi.dataset.taskId;
        const editInput = taskItemLi.querySelector('.edit-task-input');
        const day = taskItemLi.closest('.day-column')?.dataset.day;

        if (!taskId || !editInput || !day) {
            console.error("Missing data to exit edit mode.", { taskId, day, hasInput: !!editInput });
            taskItemLi.classList.remove('editing');
            return;
        }

        console.log(`Exiting edit mode for task ID ${taskId}. Save changes: ${saveChanges}`);
        const originalTask = tasksByDay[day]?.find(t => String(t.id) === String(taskId));
        const originalText = originalTask?.text ?? '';

        if (saveChanges) {
            const newText = editInput.value.trim();
            if (!newText) {
                alert("Görev metni boş bırakılamaz!");
                editInput.value = originalText;
                editInput.focus();
                return;
            }
            if (newText !== originalText) {
                 console.log(`Text changed for task ${taskId}. Original: "${originalText}", New: "${newText}"`);
                 updateTask(taskId, day, { gorev_metni: newText });
            } else {
                 console.log(`Text not changed for task ${taskId}. No API call needed.`);
            }
        } else {
             editInput.value = originalText;
             console.log(`Edit cancelled for task ${taskId}. Input reset to: "${originalText}"`);
        }

        taskItemLi.classList.remove('editing');

         if (!saveChanges) {
             const taskListElement = daysGridContainer.querySelector(`.day-column[data-day="${day}"] .task-list`);
             renderTaskList(day, taskListElement);
         }
    };

    // --- Event Handlers ---
    const handleAddTaskFormSubmit = (event) => {
        event.preventDefault();
        const form = event.target;
        const input = form.querySelector('.new-task-input');
        const button = form.querySelector('.add-task-button');
        const day = form.closest('.day-column')?.dataset.day;

        if (input && day && input.value.trim() && !button.disabled) {
            const taskText = input.value;
            console.log(`Form submitted for day ${day} with text: "${taskText}"`);
            addTask(day, taskText);
        } else {
             console.warn("Add task form submit ignored. Input empty, day missing, or button disabled.");
        }
    };

    const handleNewTaskInput = (event) => {
        const input = event.target;
        const form = input.closest('form');
        const button = form?.querySelector('.add-task-button');
        if (button && input) {
            button.disabled = input.value.trim() === '';
        }
    };

    const handleGridInteraction = (event) => {
        const target = event.target;
        const taskItemLi = target.closest('li.task-item');

        if (!taskItemLi || taskItemLi.classList.contains('removing')) return;

        const taskId = taskItemLi.dataset.taskId;
        const day = taskItemLi.closest('.day-column')?.dataset.day;

        if (!taskId || !day) {
             console.warn("Interaction on task item without valid ID or day.", {taskId, day, element: taskItemLi});
             return;
         }

        if (taskItemLi.classList.contains('editing')) {
            if (target.closest('.save-edit-button')) {
                console.log(`Save button clicked for task ${taskId}`);
                exitEditMode(taskItemLi, true);
            } else if (target.closest('.cancel-edit-button')) {
                console.log(`Cancel button clicked for task ${taskId}`);
                exitEditMode(taskItemLi, false);
            } else if (!target.closest('.edit-task-input-container')) {
                 // ... (handled by blur)
            }
            return;
        }

        if (target.classList.contains('task-checkbox')) {
            const isCompleted = target.checked;
            console.log(`Checkbox clicked for task ${taskId}. New state: ${isCompleted}`);
            updateTask(taskId, day, { tamamlandi: isCompleted });
        } else if (target.closest('.edit-task-button')) {
             console.log(`Edit button clicked for task ${taskId}`);
            enterEditMode(taskItemLi);
        } else if (target.closest('.delete-task-button')) {
             console.log(`Delete button clicked for task ${taskId}`);
            const taskText = taskItemLi.querySelector('.task-text')?.textContent || 'Bu görevi';
            if (confirm(`'${escapeHtml(taskText)}' adlı görevi silmek istediğinizden emin misiniz?`)) {
                deleteTask(taskId, day);
            } else {
                 console.log(`Deletion cancelled for task ${taskId}`);
            }
        } else if (target.closest('.task-content')) {
            if (!taskItemLi.classList.contains('completed')) {
                 console.log(`Task content clicked for task ${taskId}. Entering edit mode.`);
                 enterEditMode(taskItemLi);
            } else {
                console.log(`Task content clicked for completed task ${taskId}. No action.`);
            }
        }
    };

    const handleEditInputKeydown = (event) => {
        if (!event.target.classList.contains('edit-task-input')) return;
        const taskItemLi = event.target.closest('li.task-item');
        if (!taskItemLi || !taskItemLi.classList.contains('editing')) return;

        if (event.key === 'Enter') {
            event.preventDefault();
            console.log(`Enter key pressed in edit input for task ${taskItemLi.dataset.taskId}`);
            exitEditMode(taskItemLi, true);
        } else if (event.key === 'Escape') {
             console.log(`Escape key pressed in edit input for task ${taskItemLi.dataset.taskId}`);
            exitEditMode(taskItemLi, false);
        }
    };

     const handleEditInputBlur = (event) => {
         if (!event.target.classList.contains('edit-task-input')) return;
         const taskItemLi = event.target.closest('li.task-item');

         if (taskItemLi && taskItemLi.classList.contains('editing')) {
             const relatedTarget = event.relatedTarget;
             const editContainer = taskItemLi.querySelector('.edit-task-input-container');

             if (!editContainer || !editContainer.contains(relatedTarget)) {
                  console.log(`Blur event on edit input for task ${taskItemLi.dataset.taskId}. Related target:`, relatedTarget);
                 setTimeout(() => {
                     if (taskItemLi.classList.contains('editing')) {
                         console.log(`Auto-saving task ${taskItemLi.dataset.taskId} due to blur.`);
                         exitEditMode(taskItemLi, true);
                     }
                 }, 150);
             } else {
                 console.log(`Blur event on edit input for task ${taskItemLi.dataset.taskId}, but focus moved within container.`);
             }
         }
     };


    // --- Initialization Sequence ---
    // 1. Kullanıcı ID'sini al (Eğer yoksa zaten login'e yönlendirir)
    // BURADA YAPTIĞIMIZ DEĞİŞİKLİK getUserId FONKSİYONUNUN İÇİNDE
    const currentUserId = getUserId();

    // 2. Eğer kullanıcı ID varsa, görevleri yükle ve olay dinleyicileri ekle
    if (currentUserId) {
        console.log("User ID found:", currentUserId);
        loadTasks();

        daysGridContainer.addEventListener('click', handleGridInteraction);
        daysGridContainer.addEventListener('keydown', handleEditInputKeydown);
        daysGridContainer.addEventListener('focusout', handleEditInputBlur);

        const addTaskForms = daysGridContainer.querySelectorAll('.add-task-form');
        addTaskForms.forEach(form => {
            form.addEventListener('submit', handleAddTaskFormSubmit);
            const input = form.querySelector('.new-task-input');
            if (input) {
                input.addEventListener('input', handleNewTaskInput);
                input.addEventListener('blur', handleNewTaskInput);
                handleNewTaskInput({ target: input });
            }
        });

        console.log("todolist.js: DB-Connected Weekly Planner Initialized Successfully.");
    } else {
         console.error("todolist.js: Initialization aborted due to missing User ID (should have redirected).");
    }

}); // End DOMContentLoaded