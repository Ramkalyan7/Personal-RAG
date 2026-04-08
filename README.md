# Personal RAG

RAG application where users can create projects, upload different kinds of data, index that data, and query it through a project-scoped chat experience.

## TODO

1. Use LLM-based chunking or semantic chunking instead of only recursive chunking.
2. Add reranking and compression after retrieval before sending context to the generation model.
3. Generate an LLM-based summary for each chunk while storing data in the vector database.
4. Use `unstructured.io` or another advanced PDF parser for complex PDF parsing.
5. Add evaluations to measure retrieval quality and answer quality.
6. Add HyDE retrieval to improve search quality for ambiguous or underspecified queries.
