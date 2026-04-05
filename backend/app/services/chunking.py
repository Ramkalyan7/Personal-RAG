from langchain_text_splitters import RecursiveCharacterTextSplitter


chunk_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    chunk_size=512,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_text(text: str) -> list[str]:
    chunks = chunk_splitter.split_text(text)
    return [chunk.strip() for chunk in chunks if chunk.strip()]
