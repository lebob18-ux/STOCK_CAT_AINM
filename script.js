// URL de votre dépôt central de miniatures GitHub
const GITHUB_MINIATURES_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";

let catalogueGlobal = []; 
let stockGlobal = [];      
let articleCourant = null;

window.addEventListener('DOMContentLoaded', () => {
    // --- ENREGISTREMENT DU SERVICE WORKER (PWA) ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker enregistré !', reg.scope))
            .catch(err => console.log('Erreur Service Worker :', err));
    }

    Promise.all([
        fetch(GITHUB_MINIATURES_URL + 'mapping.json').then(res => res.json()),
        Promise.resolve(localStorage.getItem('stock_local_sauvegarde'))
    ])
    .then(([catalogueData, stockSauvegarde]) => {
        catalogueGlobal = catalogueData;
        console.log("Catalogue chargé :", catalogueGlobal.length, "articles.");

        if (stockSauvegarde) {
            stockGlobal = JSON.parse(stockSauvegarde);
            console.log("Stock récupéré de la mémoire du téléphone :", stockGlobal.length, "entrées.");
        } else {
            fetch('stock_global.csv')
                .then(res => res.text())
                .then(csvText => {
                    if (csvText) {
                        stockGlobal = parserCSVEnTableau(csvText);
                        console.log("Stock global initial chargé :", stockGlobal.length, "entrées.");
                    }
                })
                .catch(() => console.log("Aucun fichier CSV de base, démarrage à vide."));
        }
    })
    .catch(err => console.error("Erreur de chargement des fichiers :", err));

    const inputSymbole = document.getElementById('inputSymbole');
    inputSymbole.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        if (valeur.length > 0) {
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
        }

        if (valeur.length >= 5) {
            afficherSuggestionsSymbole(valeur);
        } else {
            document.getElementById('suggestions').innerHTML = '';
        }
    });

    const inputPlan = document.getElementById('inputPlan');
    inputPlan.addEventListener('input', () => {
        document.getElementById('inputSymbole').value = '';
        document.getElementById('suggestions').innerHTML = '';
    });

    // Sélection automatique du texte de la quantité au clic pour taper directement
    const inputQuantite = document.getElementById('stockQuantite');
    inputQuantite.addEventListener('focus', function() {
        this.select();
    });
});

// --- RECHERCHE PAR PLAN ---
function rechercherParPlan() {
    let saisie = document.getElementById('inputPlan').value.trim();
    if (!saisie) return;
    
    let planFormate = saisie.padStart(6, '0');
    document.getElementById('inputPlan').value = planFormate;

    document.getElementById('inputSymbole').value = '';
    document.getElementById('suggestions').innerHTML = '';

    let correspondances = catalogueGlobal.filter(item => item.plan === planFormate);
    let conteneurListe = document.getElementById('listePlanResultats');
    conteneurListe.innerHTML = '';

    if (correspondances.length === 0) {
        alert("Aucun article trouvé pour le plan : " + planFormate);
        return;
    }

    if (correspondances.length === 1) {
        afficherFiche(correspondances[0]);
    } else {
        let html = `<div style="background: #eef2f7; padding: 12px; border-radius: 6px; margin-top: 10px;">`;
        html += `<p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Plusieurs REP trouvés (Cliquez sur la pièce) :</p>`;
        html += `<div style="display: flex; flex-direction: column; gap: 10px; max-height: 350px; overflow-y: auto;">`;

        correspondances.forEach(article => {
            let imgUrl = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
            let articleJson = JSON.stringify(article).replace(/"/g, '&quot;');
            
            html += `
                <div class="suggestion-item" onclick='selectionnerArticlePlan(${articleJson})' style="cursor: pointer; border: 1px solid #ddd; padding: 8px; border-radius: 6px; display: flex; align-items: center; gap: 12px; background: white;">
                    <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/120x90?text=No'">
                    <div style="font-size: 14px;">
                        <strong style="font-size: 15px; color: #0056b3;">REP : ${article.rep}</strong> | Symbole : ${article.symbole}<br>
                        <small style="color: #555; display: inline-block; margin-top: 4px;">${article.intitule}</small>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
        conteneurListe.innerHTML = html;
    }
}

function selectionnerArticlePlan(article) {
    document.getElementById('listePlanResultats').innerHTML = ''; 
    document.getElementById('inputPlan').value = article.plan;
    document.getElementById('inputSymbole').value = '';
    afficherFiche(article);
}

// --- RECHERCHE PAR SYMBOLE ---
function afficherSuggestionsSymbole(prefixe) {
    let container = document.getElementById('suggestions');
    container.innerHTML = '';
    
    let matches = catalogueGlobal.filter(item => item.symbole.startsWith(prefixe));

    if (matches.length === 0) {
        container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 14px;">Aucune correspondance</div>';
        return;
    }

    matches.forEach(article => {
        let div = document.createElement('div');
        div.className = 'suggestion-item';
        let imgUrl = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;

        div.innerHTML = `
            <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/120x90?text=No'">
            <div style="font-size: 14px;">
                <strong style="color: #0056b3;">Symb: ${article.symbole}</strong> (Plan: ${article.plan} / REP: ${article.rep})<br>
                <small style="color: #555; display: inline-block; margin-top: 3px;">${article.intitule}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputSymbole').value = article.symbole;
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
            container.innerHTML = '';
            afficherFiche(article);
        });
        
        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE & SÉLECTION DES EMPLACEMENTS EXISTANTS ---
function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan;
    document.getElementById('resRep').textContent = article.rep;
    document.getElementById('resSymbole').textContent = article.symbole;
    document.getElementById('resIntitule').textContent = article.intitule;

    let img = document.getElementById('imgPiece');
    img.src = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
    img.onerror = () => img.src = 'https://via.placeholder.com/160x120?text=Introuvable';

    let existants = stockGlobal.filter(item => item.symbole === article.symbole && item.rep === article.rep);
    let divStock = document.getElementById('infoStockActuel');
    
    if (existants.length > 0) {
        divStock.style.display = 'block';
        divStock.style.backgroundColor = '#d4edda';
        divStock.style.border = '1px solid #c3e6cb';
        divStock.style.color = '#155724';
        
        let htmlStock = `<strong>📦 EMPLACEMENTS EXISTANTS (${existants.length}) :</strong><br>
        <p style="font-size: 12px; margin: 4px 0 8px 0;">Cliquez sur un emplacement pour y rajouter de la quantité, ou remplissez les champs en bas pour créer un nouveau lieu :</p>
        <div style="display: flex; flex-direction: column; gap: 6px;">`;
        
        existants.forEach((ex) => {
            let exJson = JSON.stringify(ex).replace(/"/g, '&quot;');
            htmlStock += `
                <div onclick='selectionnerEmplacementExistant(${exJson})' style="cursor: pointer; background: white; border: 1px solid #28a745; padding: 6px 10px; border-radius: 4px; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                    <div>📍 Site: <b>${ex.site}</b> | Bât: <b>${ex.batiment}</b> | Rang: <b>${ex.rang}</b></div>
                    <div style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Qte: ${ex.quantite}</div>
                </div>
            `;
        });
        htmlStock += `</div>`;
        divStock.innerHTML = htmlStock;
        
        document.getElementById('stockSite').value = "";
        document.getElementById('stockBatiment').value = "";
        document.getElementById('stockRang').value = "";
    } else {
        divStock.style.display = 'block';
        divStock.style.backgroundColor = '#fff3cd';
        divStock.style.border = '1px solid #ffeeba';
        divStock.style.color = '#856404';
        divStock.innerHTML = `<strong>⚠️ AUCUN STOCK :</strong> Pièce non référencée. Saisissez l'emplacement ci-dessous.`;
        
        document.getElementById('stockSite').value = "";
        document.getElementById('stockBatiment').value = "";
        document.getElementById('stockRang').value = "";
    }

    document.getElementById('stockQuantite').value = "1";
    document.getElementById('resultat').style.display = 'block';
}

function selectionnerEmplacementExistant(existant) {
    document.getElementById('stockSite').value = existant.site;
    document.getElementById('stockBatiment').value = existant.batiment;
    document.getElementById('stockRang').value = existant.rang;
    document.getElementById('stockQuantite').focus();
}

// --- VALIDATION DIRECTE ---
function validerStockage() {
    if (!articleCourant) return;

    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;

    if (!site || !batiment || !rang) {
        alert("Veuillez remplir tous les champs obligatoires (Site, Bâtiment, Rang) ou cliquer sur un emplacement existant.");
        return;
    }

    let index = stockGlobal.findIndex(item => 
        item.symbole === articleCourant.symbole && 
        item.rep === articleCourant.rep && 
        item.site.toLowerCase() === site.toLowerCase() && 
        item.batiment.toLowerCase() === batiment.toLowerCase() && 
        item.rang.toLowerCase() === rang.toLowerCase()
    );

    if (index !== -1) {
        stockGlobal[index].quantite += qte;
    } else {
        stockGlobal.push({
            plan: articleCourant.plan,
            rep: articleCourant.rep,
            symbole: articleCourant.symbole,
            intitule: articleCourant.intitule,
            site: site,
            batiment: batiment,
            rang: rang,
            quantite: qte
        });
    }

    localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobal));

    document.getElementById('resultat').style.display = 'none';
    document.getElementById('inputPlan').value = "";
    document.getElementById('inputSymbole').value = "";
    document.getElementById('listePlanResultats').innerHTML = "";
    document.getElementById('suggestions').innerHTML = "";
    document.getElementById('stockQuantite').value = "1";
    articleCourant = null;
}

function echapperCSV(texte) {
    if (!texte) return '""';
    let textePropre = String(texte).replace(/"/g, '""');
    return `"${textePropre}"`;
}

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

    localStorage.removeItem('stock_local_sauvegarde');
}

function parserCSVEnTableau(texte) {
    let lignes = texte.split('\n');
    let resultat = [];
    
    for (let i = 1; i < lignes.length; i++) {
        let ligne = lignes[i].trim();
        if (!ligne) continue;
        
        let donnees = [];
        let entreGuillemets = false;
        let valeurCourante = "";
        
        for (let j = 0; j < ligne.length; j++) {
            let char = ligne[j];
            if (char === '"' && ligne[j+1] === '"') { 
                valeurCourante += '"'; 
                j++; 
            } else if (char === '"') { 
                entreGuillemets = !entreGuillemets; 
            } else if (char === ',' && !entreGuillemets) { 
                donnees.push(valeurCourante); 
                valeurCourante = ""; 
            } else { 
                valeurCourante += char; 
            }
        }
        donnees.push(valeurCourante);
        
        if (donnees.length >= 8) {
            resultat.push({
                plan: donnees[0],
                rep: donnees[1],
                symbole: donnees[2],
                intitule: donnees[3],
                site: donnees[4],
                batiment: donnees[5],
                rang: donnees[6],
                quantite: parseInt(donnees[7]) || 0
            });
        }
    }
    return resultat;
}

// --- PARTAGE DU STOCK (API NATIVE DU TÉLÉPHONE) ---
async function partagerStock() {
    if (stockGlobal.length === 0) {
        alert("Aucune donnée de stock à partager.");
        return;
    }

    let csvContent = "plan,rep,symbole,intitule,site,batiment,rang,quantite\n";
    stockGlobal.forEach(item => {
        csvContent += `${item.plan},${item.rep},${item.symbole},${echapperCSV(item.intitule)},${echapperCSV(item.site)},${echapperCSV(item.batiment)},${echapperCSV(item.rang)},${item.quantite}\n`;
    });

    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let fichier = new File([blob], "stock_global.csv", { type: 'text/csv' });

    if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
        try {
            await navigator.share({
                title: 'Mise à jour stock terrain caténaire',
                text: 'Voici le fichier de mise à jour du stock terrain.',
                files: [fichier]
            });
            
            localStorage.removeItem('stock_local_sauvegarde');
            console.log("Partage réussi et mémoire nettoyée.");
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Erreur lors du partage :", error);
            }
        }
    } else {
        alert("Votre appareil ne prend pas en charge le partage direct de fichiers. Le fichier va être téléchargé à la place.");
        exporterStockGlobalCSV();
    }
}
