# Semantic RAG Vector Search Playground

An educational utility designed to visualize how Retrieval-Augmented Generation (RAG) processes, indexes, and queries custom documents. It performs client-side tokenization, sliding-window chunking, term-frequency vector creation, and mathematical cosine-similarity matching directly in the browser.

---

## 🌟 Features

* **Document Ingestion Engine**: Paste custom corporate policies, FAQs, or menus, or select predefined presets.
* **Sliding-Window Tokenizer**: Customize chunk boundaries by adjusting the **Chunk Size** and **Overlap** word counts.
* **Vector Index Indexer**: Displays a grid list of all generated text chunks alongside their word count stats.
* **Cosine-Similarity Query Matcher**: Computes real-time vector cosine similarity weights to match search queries against the index.
* **Semantic Keyword Marker**: Highlights query matches inside text chunks using `<mark>` tag styling.
* **Synthesized LLM Response**: Simulates how an LLM reads the top matching contexts to write a final, fact-checked answer, eliminating hallucinations.

---

## 🛠️ How to Use

1. Open `index.html` in any web browser.
2. Select a **Document Preset** (e.g. *Bistro Menu & Hours*) or select *Custom Text* to paste your own.
3. Set the **Chunk Size** and **Overlap** sliders.
4. Click **Tokenize & Embed Chunks**. Review the generated chunks in the left index.
5. Enter a search query in the query bar (e.g., *Do you have gluten free pizza crust?*).
6. Click **Search DB**. View the similarity match percentages and read the synthesized LLM answer.

---

## 💼 Business Value & Use Case

Generic LLMs hallucinate and lack specific company knowledge. This playground demonstrates the solution:
* **Hallucination Prevention**: Visualizes how RAG feeds exact factual chunks to the model, ensuring the AI only answers based on verified sources.
* **Parameters Optimization**: Helps developers and clients understand how chunk sizes and overlaps affect search accuracy and retrieval.
* **Data Security Proof**: Proves that data is stored locally in vector chunks rather than retraining models, maintaining enterprise data privacy.
