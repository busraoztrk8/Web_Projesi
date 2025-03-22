function DiaryEntry(entry) {
    const entryDiv = document.createElement('div');
    entryDiv.classList.add('diary-entry');

    const contentP = document.createElement('p');
    contentP.textContent = entry.content;
    entryDiv.appendChild(contentP);

    const timestampP = document.createElement('p');
    timestampP.textContent = entry.timestamp;
    entryDiv.appendChild(timestampP);

    const sentimentP = document.createElement("p");
    sentimentP.textContent = `Duygu: ${entry.sentiment}`;
    entryDiv.appendChild(sentimentP);

    const editButton = document.createElement('button');
    editButton.textContent = 'Düzenle';
    editButton.classList.add("edit-button"); //Class ekle
    entryDiv.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Sil';
    deleteButton.classList.add("delete-button"); //Class ekle
    entryDiv.appendChild(deleteButton);

    return entryDiv;
}

export default DiaryEntry;