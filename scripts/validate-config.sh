#!/bin/bash

# Script de validation automatique après configuration
# Utilisation: ./scripts/validate-config.sh

echo "🔍 Validation post-configuration..."
echo "=================================="

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de vérification TypeScript
check_typescript() {
    echo -e "\n📝 Vérification TypeScript..."
    
    # Essayer d'abord notre vérificateur personnalisé (plus rapide)
    if [ -f "scripts/check-typescript-errors.cjs" ]; then
        if node scripts/check-typescript-errors.cjs; then
            echo -e "${GREEN}✅ TypeScript: Aucune erreur critique détectée${NC}"
            return 0
        else
            echo -e "${RED}❌ TypeScript: Erreurs détectées par le vérificateur personnalisé${NC}"
            return 1
        fi
    # Sinon utiliser tsc si disponible
    elif [ -f "node_modules/.bin/tsc" ]; then
        if node_modules/.bin/tsc --noEmit; then
            echo -e "${GREEN}✅ TypeScript: Compilation réussie${NC}"
            return 0
        else
            echo -e "${RED}❌ TypeScript: Erreurs de compilation détectées${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  TypeScript: Skippé (tsc non disponible)${NC}"
        return 0
    fi
}

# Fonction de vérification des tests
check_tests() {
    echo -e "\n🧪 Vérification des tests..."
    
    if [ -f "node_modules/.bin/jest" ]; then
        if npm test --silent; then
            echo -e "${GREEN}✅ Tests: Tous les tests passent${NC}"
            return 0
        else
            echo -e "${RED}❌ Tests: Échecs détectés${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Tests: Skipped - dépendances non installées${NC}"
        return 0
    fi
}

# Fonction de vérification de la syntaxe des fichiers config
check_config_syntax() {
    echo -e "\n⚙️  Vérification syntaxe des configurations..."
    
    # Vérifier tsconfig.json
    if node -e "JSON.parse(require('fs').readFileSync('tsconfig.json', 'utf8'))" 2>/dev/null; then
        echo -e "${GREEN}✅ tsconfig.json: Syntaxe valide${NC}"
    else
        echo -e "${RED}❌ tsconfig.json: Syntaxe invalide${NC}"
        return 1
    fi
    
    # Vérifier tsconfig.test.json si existe
    if [ -f "tsconfig.test.json" ]; then
        if node -e "JSON.parse(require('fs').readFileSync('tsconfig.test.json', 'utf8'))" 2>/dev/null; then
            echo -e "${GREEN}✅ tsconfig.test.json: Syntaxe valide${NC}"
        else
            echo -e "${RED}❌ tsconfig.test.json: Syntaxe invalide${NC}"
            return 1
        fi
    fi
    
    # Vérifier package.json
    if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
        echo -e "${GREEN}✅ package.json: Syntaxe valide${NC}"
    else
        echo -e "${RED}❌ package.json: Syntaxe invalide${NC}"
        return 1
    fi
}

# Exécution des vérifications
main() {
    local exit_code=0
    
    check_config_syntax || exit_code=1
    check_typescript || exit_code=1
    check_tests || exit_code=1
    
    echo -e "\n=================================="
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 Validation réussie! Configuration OK${NC}"
    else
        echo -e "${RED}💥 Validation échouée! Vérifiez les erreurs ci-dessus${NC}"
    fi
    echo "=================================="
    
    return $exit_code
}

# Point d'entrée
main "$@"