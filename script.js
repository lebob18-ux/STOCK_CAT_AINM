// URL de votre dépôt central de miniatures GitHub (les images sont nommées par leur symbole ex: 08804001.jpg)
const GITHUB_MINIATURES_URL = "https://raw.githubusercontent.com/VOTRE_COMPTE/depot-miniatures/main/";

let catalogueGlobal = []; // Contient le mapping.json
let stockGlobal = [];     // Contient l'état du stock (fusion local + export)
let articleCourant = null;

window.addEventListener('DOMContentLoaded', () => {
    // 1. Charger le fichier JSON unique de correspondance
    fetch('mapping.json')
        .then(response => response.json())
        .then(data => {
            catalogueGlobal = data;
            console.log("Catalogue chargé :", catalogueGlobal.length, "articles.");
        })
        .catch(err => console.error("Erreur de chargement du mapping.json :", err));

    // 2. Charger le stock enregistré localement sur l'appareil
    let localSauvegarde = localStorage.getItem('stock_magasin_local');
    if (localSauvegarde) {
        stockGlobal = JSON.parse(localSauvegarde);
    }

    // 3. Écouteur pour la recherche dynamique par Symbole (dès 5 caractères)
    const inputSymbole = document.getElementById('inputSymbole');
    inputSymbole.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        if (valeur.length >= 5) {
            afficherSuggestionsSymbole(valeur);
        } else {
            document.getElementById('suggestions').innerHTML = '';
        }
    });
});

// --- RECHERCHE PAR PLAN (Gère les REP multiples) ---
function rechercherParPlan() {
    let saisie = document.getElementById('inputPlan').value.trim();
    if (!saisie) return;
    
    let planFormate = saisie.padStart(6, '0');
    document.getElementById('inputPlan').value = planFormate;

    // Recherche tous les articles partageant ce Plan
    let correspondances = catalogueGlobal.filter(item => item.plan === planFormate);
    let conteneurListe = document.getElementById('listePlanResultats');
    conteneurListe.innerHTML = '';

    if (correspondances.length === 0) {
        alert("Aucun article trouvé pour le plan : " + planFormate);
        return;
    }

    if (correspondances.length === 1) {
        // Un seul résultat direct
        afficherFiche(correspondances[0]);
    } else {
        // Plusieurs REP pour ce plan : affichage de la liste des miniatures
        let html = `<div style="background: #eef2f7; padding: 10px; border-radius: 6px; margin-top: 10px;">`;
        html += `<p style="margin: 0 0 8px 0; font-weight: bold; font-size: 13px;">Plusieurs REP trouvés (Cliquez sur la miniature pour valider) :</p>`;
        html += `<div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">`;

        correspondances.forEach(article => {
            let imgUrl = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
            // Échappement propre pour passer l'objet dans la fonction au clic
            let articleJson = JSON.stringify(article).replace(/"/g, '&quot;');
            
            html += `
                <div class="suggestion-item" onclick='selectionnerArticlePlan(${articleJson})' style="cursor: pointer; border: 1px solid #ddd; padding: 6px; border-radius: 4px; display: flex; align-items: center; gap: 10px; background: white;">
                    <img src="${imgUrl}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;" onerror="this.src='https://via.placeholder.com/45?text=No'">
                    <div style="font-size: 13px;">
                        <strong>REP : ${article.rep}</strong> | Symbole : ${article.symbole}<br>
                        <small style="color: #666;">${article.intitule}</small>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
        conteneurListe.innerHTML = html;
    }
}

// Sélection d'un article depuis la liste des REP du Plan
function selectionnerArticlePlan(article) {
    document.getElementById('listePlanResultats').innerHTML = ''; // Efface la liste
    document.getElementById('inputPlan').value = article.plan;
    afficherFiche(article);
}

// --- RECHERCHE PAR SYMBOLE (Autocomplétion dès 5 caractères) ---
function afficherSuggestionsSymbole(prefixe) {
    let container = document.getElementById('suggestions');
    container.innerHTML = '';
    
    let matches = catalogueGlobal.filter(item => item.symbole.startsWith(prefixe));

    if (matches.length === 0) {
        container.innerHTML = '<div style="padding: 8px; color: #777; font-size: 13px;">Aucune correspondance</div>';
        return;
    }

    matches.forEach(article => {
        let div = document.createElement('div');
        div.className = 'suggestion-item';
        let imgUrl = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;

        div.innerHTML = `
            <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/40?text=No'">
            <div style="font-size: 13px;">
                <strong>Symb: ${article.symbole}</strong> (Plan: ${article.plan} / REP: ${article.rep})<br>
                <small style="color: #666;">${article.intitule}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputSymbole').value = article.symbole;
            container.innerHTML = '';
            afficherFiche(article);
        });
        
        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE ARTICLE ---
function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan;
    document.getElementById('resRep').textContent = article.rep;
    document.getElementById('resSymbole').textContent = article.symbole;
    document.getElementById('resIntitule').textContent = article.intitule;

    let img = document.getElementById('imgPiece');
    img.src = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
    img.onerror = () => img.src = 'https://via.placeholder.com/120?text=Introuvable';

    // Vider les champs d'emplacement
    document.getElementById('stockSite').value = "";
    document.getElementById('stockBatiment').value = "";
    document.getElementById('stockRang').value = "";
    document.getElementById('stockQuantite').value = "1";

    document.getElementById('resultat').style.display = 'block';
}

// --- VALIDATION DE L'EMPLACEMENT & GESTION DES DOUBLONS ---
function validerStockage() {
    if (!articleCourant) return;

    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;

    if (!site || !batiment || !rang) {
        alert("Veuillez remplir tous les champs de localisation (Site, Bâtiment, Rang).");
        return;
    }

    // Vérifie si la pièce existe déjà (identifiée par son couple Symbole + REP)
    let existant = stockGlobal.find(item => item.symbole === articleCourant.symbole && item.rep === articleCourant.rep);

    if (existant) {
        document.getElementById('modalTexteInfo').innerHTML = `
            L'article <b>${articleCourant.symbole}</b> (REP: ${article.rep}) est déjà enregistré à l'emplacement :<br>
            <u>Site:</u> ${existant.site} / <u>Bât.:</u> ${existant.batiment} / <u>Rang:</u> ${existant.rang}<br>
            Quantité actuelle en stock : <b>${existant.quantite}</b>.<br><br>
            Voulez-vous ajouter <b>+${qte}</b> au même endroit ou placer la suite ailleurs ?
        `;
        document.getElementById('modalExistant').style.display = 'flex';
    } else {
        sauvegarderLigneStock(site, batiment, rang, qte, false);
    }
}

function fusionnerQuantite() {
    let qteAjout = parseInt(document.getElementById('stockQuantite').value) || 0;
    let existant = stockGlobal.find(item => item.symbole === articleCourant.symbole && item.rep === articleCourant.rep);
    if (existant) {
        existant.quantite += qteAjout;
        persisterEtFermer("Quantité mise à jour avec succès !");
    }
}

function forcerNouvelEmplacement() {
    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;
    sauvegarderLigneStock(site, batiment, rang, qte, true);
}

function sauvegarderLigneStock(site, batiment, rang, qte, remplacer) {
    let index = stockGlobal.findIndex(item => item.symbole === articleCourant.symbole && item.rep === articleCourant.rep);
    
    let nouvelleEntree = {
        plan: articleCourant.plan,
        rep: articleCourant.rep,
        symbole: articleCourant.symbole,
        intitule: articleCourant.intitule,
        site: site,
        batiment: batiment,
        rang: rang,
        quantite: qte
    };

    if (index !== -1 && remplacer) {
        stockGlobal[index] = nouvelleEntree;
    } else if (index === -1) {
        stockGlobal.push(nouvelleEntree);
    }

    persisterEtFermer("Enregistrement effectué !");
}

function persisterEtFermer(message) {
    localStorage.setItem('stock_magasin_local', JSON.stringify(stockGlobal));
    document.getElementById('modalExistant').style.display = 'none';
    document.getElementById('resultat').style.display = 'none';
    document.getElementById('inputPlan').value = "";
    document.getElementById('inputSymbole').value = "";
    alert(message);
}

// Fonction utilitaire pour protéger les chaînes dans le CSV généré
function echapperCSV(texte) {
    if (!texte) return '""';
    let textePropre = String(texte).replace(/"/g, '""');
    return `"${textePropre}"`;
}

// --- EXPORT CSV GLOBAL (Pour mettre à jour GitHub pour l'équipe) ---
function exporterStockGlobalCSV() {
    if (stockGlobal.length === 0) {
        alert("Aucune donnée de stock à exporter.");
        return;
    }

    let csvContent = "plan,rep,symbole,intitule,site,batiment,rang,quantite\n";
    stockGlobal.forEach(item => {
        csvContent += `${item.plan},${item.rep},${item.symbole},${echapperCSV(item.intitule)},${echapperCSV(item.site)},${echapperCSV(item.batiment)},${echapperCSV(item.rang)},${item.quantite}\n`;
    });

    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "stock_global.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
