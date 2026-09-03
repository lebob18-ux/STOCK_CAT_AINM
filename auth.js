// --- 1. CONFIGURATION SUPABASE (Clés publiques anonymes uniquement)23-35 ---
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";

// Initialisation sécurisée du client
const supabaseClientAuth = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- 2. VÉRIFICATION AUTOMATIQUE AU CHARGEMENT ---
document.addEventListener("DOMContentLoaded", async () => {
    if (!supabaseClientAuth) {
        console.error("Erreur critique : La bibliothèque Supabase n'est pas chargée.");
        return;
    }
    await verifierAcces();
});

async function verifierAcces() {
    const savedEmail = localStorage.getItem('user_email_app');
    const overlay = document.getElementById('auth-overlay');
    const formDemande = document.getElementById('form-demande');
    const attenteValidation = document.getElementById('attente-validation');

    if (!savedEmail) {
        afficherFormulaire(overlay, formDemande, attenteValidation);
        return;
    }

    // Interrogation sécurisée de la base
    try {
        const { data, error } = await supabaseClientAuth
            .from('utilisateurs_K1')
            .select('valide')
            .eq('email', savedEmail)
            .single();

        if (error || !data) {
            // Email inconnu ou supprimé de la base
            localStorage.removeItem('user_email_app');
            afficherFormulaire(overlay, formDemande, attenteValidation);
            return;
        }

        if (data.valide === true) {
            // ACCÈS AUTORISÉ : On retire l'overlay de protection
            if (overlay) overlay.style.display = 'none';
        } else {
            // ACCÈS EN ATTENTE
            afficherAttente(overlay, formDemande, attenteValidation);
        }
    } catch (err) {
        console.error("Erreur lors de la vérification de l'accès :", err);
    }
}

// --- 3. ENREGISTREMENT SÉCURISÉ DE LA DEMANDE ---
async function envoyerDemandeAcces() {
    const prenom = document.getElementById('req-prenom').value.trim();
    const nom = document.getElementById('req-nom').value.trim();
    const email = document.getElementById('req-email').value.trim().toLowerCase();

    // Validation basique des champs
    if (!prenom || !nom || !email) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    // Validation stricte du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Veuillez saisir une adresse e-mail valide.");
        return;
    }

    try {
        // On force explicitement 'valide: false' pour empêcher toute tentative de contournement
        const { error } = await supabaseClientAuth
            .from('utilisateurs_K1')
            .insert([{ 
                prenom: prenom, 
                nom: nom, 
                email: email, 
                valide: false 
            }]);

        if (error) {
            // Gestion propre de l'erreur (ex: doublon d'email)
            if (error.code === '23505') {
                alert("Cet e-mail a déjà fait l'objet d'une demande d'accès.");
            } else {
                alert("Erreur lors de l'enregistrement : " + error.message);
            }
        } else {
            // Sauvegarde locale de l'email
            localStorage.setItem('user_email_app', email);
            
            // Bascule sur l'écran d'attente
            const overlay = document.getElementById('auth-overlay');
            const formDemande = document.getElementById('form-demande');
            const attenteValidation = document.getElementById('attente-validation');
            afficherAttente(overlay, formDemande, attenteValidation);
        }
    } catch (err) {
        alert("Une erreur technique est survenue.");
        console.error(err);
    }
}

// --- 4. FONCTIONS UTILITAIRES D'AFFICHAGE ---
function afficherFormulaire(overlay, form, attente) {
    if (overlay) overlay.style.display = 'flex';
    if (form) form.style.display = 'block';
    if (attente) attente.style.display = 'none';
}

function afficherAttente(overlay, form, attente) {
    if (overlay) overlay.style.display = 'flex';
    if (form) form.style.display = 'none';
    if (attente) attente.style.display = 'block';
}
