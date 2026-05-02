"""
Exceções de domínio — erros tipados em vez de retornar dicts com {"error": ...}
"""
from fastapi import HTTPException, status


class LicitacaoNotFound(HTTPException):
    def __init__(self, licitacao_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Licitação #{licitacao_id} não encontrada."
        )


class ItemNotFound(HTTPException):
    def __init__(self, item_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item #{item_id} não encontrado."
        )


class ItemMismatch(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O item não pertence a esta licitação."
        )


class InvalidFileFormat(HTTPException):
    def __init__(self, expected: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato inválido. Envie um arquivo {expected}."
        )
