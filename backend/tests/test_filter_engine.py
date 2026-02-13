from services.filter_engine import FilterEngine

def test_geographic_filter():
    assert FilterEngine.check_geographic("MA") == True
    assert FilterEngine.check_geographic("ma") == True
    assert FilterEngine.check_geographic("PI") == True
    assert FilterEngine.check_geographic("PA") == True
    assert FilterEngine.check_geographic("SP") == False
    assert FilterEngine.check_geographic("RJ") == False

def test_semantic_filter():
    # White list
    assert FilterEngine.check_semantic("Aquisição de Medicamentos") == True
    assert FilterEngine.check_semantic("Material Hospitalar") == True
    assert FilterEngine.check_semantic("Luvas de procedimento") == True
    
    # Black list
    assert FilterEngine.check_semantic("Obra de engenharia") == False
    assert FilterEngine.check_semantic("Locação de veículos") == False
    assert FilterEngine.check_semantic("Serviço de Limpeza") == False
    
    # Neutral (Rejected by default policy)
    assert FilterEngine.check_semantic("Aquisição de Canetas") == False

def test_gatekeeper():
    allowed, reason = FilterEngine.check_gatekeeper("Licitação aberta para ampla concorrência")
    assert allowed == True
    
    denied, reason = FilterEngine.check_gatekeeper("Objeto exclusivo ME/EPP conforme lei...")
    assert denied == False
    assert reason == "Exclusivo ME/EPP"

if __name__ == "__main__":
    test_geographic_filter()
    test_semantic_filter()
    test_gatekeeper()
    print("All tests passed!")
