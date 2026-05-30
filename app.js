// --- Context Document Presets ---
const PRESETS = {
    bistro: `Bistro A1 hours of operation: We are open Monday through Thursday from 11:00 AM to 10:00 PM. On Friday and Saturday, we extend our hours from 11:00 AM to 11:30 PM. We are closed on Sundays for kitchen maintenance.
Our reservation policy: Reservations are highly recommended for groups larger than 4. Tables can be booked up to 30 days in advance via our website portal or phone receptionist system.
Gluten-free menu items: We offer gluten-free crust for all our artisan pizzas for an additional $2. Our house salads and grilled salmon are naturally gluten-free. Please notify your server of any severe celiac allergies.
Our address: Bistro A1 is located at 120 North Michigan Ave, Chicago, IL 60611. Parking is validated for up to 2 hours at the Millennium Park Garage.`,
    
    clinic: `BrightSmile Dental office hours: Monday to Friday from 8:00 AM to 5:00 PM. Saturdays are reserved for emergency surgeries by appointment only. We are closed on Sundays and national holidays.
Scheduling a cleaning check: Routine dental cleanings should be scheduled every 6 months. A standard cleaning slot takes 45 minutes. Cancellations must be made at least 24 hours in advance to avoid a $50 cancellation fee.
Insurance parameters: We accept all major PPO insurance plans, including Delta Dental, Cigna, and Aetna. We do not accept HMO plans at this time. Co-payments are due at the time of service.
First time patients: Please arrive 15 minutes before your scheduled slot to fill out patient health history forms. Remember to bring a photo ID and your active insurance card.`
};

// --- DOM Elements ---
const docPreset = document.getElementById('doc-preset');
const docEditor = document.getElementById('doc-editor');
const chunkSizeSlider = document.getElementById('chunk-size');
const chunkSizeVal = document.getElementById('chunk-size-val');
const chunkOverlapSlider = document.getElementById('chunk-overlap');
const chunkOverlapVal = document.getElementById('chunk-overlap-val');
const btnIngest = document.getElementById('btn-ingest');
const totalChunksBadge = document.getElementById('total-chunks-badge');
const chunksContainer = document.getElementById('chunks-container');

// Search UI
const searchQuery = document.getElementById('search-query');
const btnSearch = document.getElementById('btn-search');
const retrievalPlaceholder = document.getElementById('retrieval-placeholder');
const retrievalContent = document.getElementById('retrieval-content');
const matchedChunksList = document.getElementById('matched-chunks-list');
const synthesisResponse = document.getElementById('synthesis-response');

// --- Global RAG Database State ---
let ingestedChunks = []; // Array of { id, text, words }
let synthesisTypingTimeout = null;

// --- Initialize App ---
function init() {
    // Load default preset
    loadPreset(docPreset.value);
    
    // Sliders
    chunkSizeSlider.addEventListener('input', (e) => {
        chunkSizeVal.textContent = `${e.target.value} words`;
    });
    
    chunkOverlapSlider.addEventListener('input', (e) => {
        chunkOverlapVal.textContent = `${e.target.value} words`;
    });
    
    docPreset.addEventListener('change', (e) => loadPreset(e.target.value));
    btnIngest.addEventListener('click', ingestDocument);
    btnSearch.addEventListener('click', performSemanticSearch);
}

// --- Load Preset ---
function loadPreset(key) {
    clearTimeout(synthesisTypingTimeout);
    
    if (key === 'custom') {
        docEditor.value = '';
        docEditor.removeAttribute('readonly');
        docEditor.focus();
    } else {
        docEditor.value = PRESETS[key];
        docEditor.setAttribute('readonly', 'true');
    }
    
    // Reset database state
    ingestedChunks = [];
    totalChunksBadge.textContent = '0';
    btnSearch.disabled = true;
    
    chunksContainer.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="muted-icon"><path d="M12 2v20"/><path d="M17 5v14"/><path d="M22 9v6"/><path d="M7 5v14"/><path d="M2 9v6"/></svg>
            <p>Knowledge base empty. Click "Tokenize & Embed Chunks" to build database.</p>
        </div>
    `;
    
    retrievalPlaceholder.classList.remove('hidden');
    retrievalContent.classList.add('hidden');
}

// --- Sliding Window Chunker ---
function ingestDocument() {
    const text = docEditor.value.trim();
    if (!text) {
        alert("Please provide document content to ingest.");
        return;
    }
    
    const size = parseInt(chunkSizeSlider.value);
    const overlap = parseInt(chunkOverlapSlider.value);
    
    if (overlap >= size) {
        alert("Overlap size must be less than the chunk size.");
        return;
    }
    
    btnIngest.disabled = true;
    btnIngest.innerHTML = `<span class="spinner"></span> Chunking Database...`;
    
    // Split into sentences first, or just words. Let's split by words for a strict sliding window.
    const words = text.split(/\s+/).filter(w => w.length > 0);
    ingestedChunks = [];
    
    let index = 0;
    let chunkId = 1;
    
    while (index < words.length) {
        const chunkWords = words.slice(index, index + size);
        const chunkText = chunkWords.join(' ');
        
        ingestedChunks.push({
            id: chunkId,
            text: chunkText,
            words: chunkWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
        });
        
        chunkId++;
        index += (size - overlap);
        
        // Break infinite loop safeguard
        if (size - overlap <= 0) break;
    }
    
    // Animate displaying chunks
    setTimeout(() => {
        btnIngest.disabled = false;
        btnIngest.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/><polyline points="10 18 10 11 7 11"/><path d="M17 14h-7"/></svg> Tokenize & Embed Chunks`;
        
        totalChunksBadge.textContent = ingestedChunks.length;
        btnSearch.disabled = false;
        
        renderChunksGrid();
    }, 800);
}

// --- Render Chunks Grid ---
function renderChunksGrid() {
    chunksContainer.innerHTML = '';
    
    ingestedChunks.forEach(chunk => {
        const div = document.createElement('div');
        div.className = 'chunk-item';
        div.id = `chunk-item-${chunk.id}`;
        div.innerHTML = `
            <div class="chunk-header-row">
                <span class="chunk-badge">Vector Chunk #${chunk.id}</span>
                <span class="chunk-words">${chunk.words.length} words</span>
            </div>
            <p class="chunk-text">${chunk.text}</p>
        `;
        chunksContainer.appendChild(div);
    });
}

// --- Cosine Similarity Vector Search ---
function performSemanticSearch() {
    const query = searchQuery.value.trim();
    if (!query) {
        alert("Please enter a search query.");
        return;
    }
    
    btnSearch.disabled = true;
    btnSearch.textContent = "...";
    clearTimeout(synthesisTypingTimeout);
    
    // Reset index highlights
    document.querySelectorAll('.chunk-item').forEach(item => {
        item.classList.remove('matched-highlight');
    });
    
    setTimeout(() => {
        btnSearch.disabled = false;
        btnSearch.textContent = "Search DB";
        
        // Clean query terms (lowercase, alphanumeric, ignore stop words)
        const stopwords = new Set(['the', 'and', 'a', 'is', 'of', 'to', 'in', 'what', 'do', 'you', 'have', 'options', 'open', 'for', 'are', 'we', 'our', 'on', 'at']);
        const queryTerms = query.toLowerCase()
            .split(/\s+/)
            .map(w => w.replace(/[^a-z0-9]/g, ''))
            .filter(w => w.length > 0 && !stopwords.has(w));
            
        if (queryTerms.length === 0) {
            // Fallback to all words if query consists only of stopwords
            queryTerms.push(...query.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')));
        }
        
        // Calculate similarity for each chunk
        const results = ingestedChunks.map(chunk => {
            const score = calculateCosineSimilarity(queryTerms, chunk.words);
            return {
                chunk: chunk,
                score: score
            };
        });
        
        // Sort results descending by score
        results.sort((a, b) => b.score - a.score);
        
        // Filter out zero matches if possible
        const topMatches = results.slice(0, 3).filter(r => r.score > 0);
        
        displayRetrievalResults(topMatches, queryTerms);
        
    }, 300);
}

// --- Cosine Similarity Formula ---
function calculateCosineSimilarity(queryTerms, chunkTerms) {
    // 1. Build combined vocabulary
    const vocab = new Set([...queryTerms, ...chunkTerms]);
    
    // 2. Build term frequency vectors
    const queryVec = Array.from(vocab).map(word => {
        return queryTerms.filter(w => w === word).length;
    });
    
    const chunkVec = Array.from(vocab).map(word => {
        return chunkTerms.filter(w => w === word).length;
    });
    
    // 3. Calculate Dot Product
    let dotProduct = 0;
    for (let i = 0; i < vocab.size; i++) {
        dotProduct += queryVec[i] * chunkVec[i];
    }
    
    // 4. Calculate Vector Norms
    const queryNorm = Math.sqrt(queryVec.reduce((sum, val) => sum + (val * val), 0));
    const chunkNorm = Math.sqrt(chunkVec.reduce((sum, val) => sum + (val * val), 0));
    
    if (queryNorm === 0 || chunkNorm === 0) return 0;
    
    return dotProduct / (queryNorm * chunkNorm);
}

// --- Render Matches & LLM Synthesis ---
function displayRetrievalResults(matches, queryTerms) {
    retrievalPlaceholder.classList.add('hidden');
    retrievalContent.classList.remove('hidden');
    matchedChunksList.innerHTML = '';
    
    if (matches.length === 0) {
        matchedChunksList.innerHTML = `
            <div class="empty-state">
                <p>No semantic matches found. Try embedding different text or using keyword overlaps.</p>
            </div>
        `;
        synthesisResponse.textContent = "I'm sorry, but I couldn't find any relevant details in the provided database to construct an answer to your query.";
        return;
    }
    
    // Render matching chunks
    matches.forEach(match => {
        const chunk = match.chunk;
        
        // Highlight active vector chunk in left panel
        const chunkEl = document.getElementById(`chunk-item-${chunk.id}`);
        if (chunkEl) chunkEl.classList.add('matched-highlight');
        
        // Highlight matching terms in matching view
        let highlightedText = chunk.text;
        queryTerms.forEach(term => {
            if (term.length > 2) { // Only highlight words longer than 2 chars
                const regex = new RegExp(`\\b(${term})\\b`, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
            }
        });
        
        const card = document.createElement('div');
        card.className = 'match-card';
        card.innerHTML = `
            <div class="match-header">
                <span class="match-id">Chunk #${chunk.id}</span>
                <span class="match-score">${(match.score * 100).toFixed(0)}% Similarity Match</span>
            </div>
            <p class="match-text">${highlightedText}</p>
        `;
        matchedChunksList.appendChild(card);
    });
    
    // Synthesize answer based on top matching chunk text
    const topChunkText = matches[0].chunk.text;
    synthesizeLLMResponse(topChunkText);
}

// --- Synthesize LLM Response ---
function synthesizeLLMResponse(context) {
    synthesisResponse.textContent = 'Synthesizing response...';
    clearTimeout(synthesisTypingTimeout);
    
    // Simple client-side synthesis mapping for presets, otherwise summary fallback
    let synthesis = "";
    
    if (context.includes("Bistro A1 hours")) {
        synthesis = "Based on the retrieved context, Bistro A1 is open Monday through Thursday from 11:00 AM to 10:00 PM, and on Friday and Saturday from 11:00 AM to 11:30 PM. Please note that they are closed on Sundays for kitchen maintenance.";
    } else if (context.includes("Gluten-free menu")) {
        synthesis = "According to our menu database, we offer gluten-free crust options for all artisan pizzas for an extra fee of $2. Our house salads and grilled salmon dishes are naturally gluten-free.";
    } else if (context.includes("BrightSmile Dental office hours")) {
        synthesis = "The retrieved context states that BrightSmile Dental is open Monday through Friday from 8:00 AM to 5:00 PM. Saturdays are reserved strictly for emergency surgeries scheduled by appointment. They remain closed on Sundays.";
    } else if (context.includes("Scheduling a cleaning")) {
        synthesis = "Based on clinic records, routine cleanings take 45 minutes and are recommended every 6 months. Be sure to cancel appointments at least 24 hours in advance to avoid a $50 fee.";
    } else if (context.includes("Insurance parameters")) {
        synthesis = "BrightSmile Dental accepts all major PPO insurance plans, including Cigna, Aetna, and Delta Dental. They currently do not accept HMO insurance options.";
    } else {
        // Fallback: simple text parser summary
        synthesis = `From the retrieved database chunk, here is the answer: ${context.slice(0, 150)}... [Synthesis complete]`;
    }
    
    // Type response
    let i = 0;
    synthesisResponse.textContent = '';
    const words = synthesis.split(' ');
    
    function type() {
        if (i < words.length) {
            synthesisResponse.textContent += (i === 0 ? '' : ' ') + words[i];
            i++;
            synthesisTypingTimeout = setTimeout(type, 35);
        }
    }
    type();
}

// Run app
window.addEventListener('DOMContentLoaded', init);
