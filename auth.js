// --- 1. CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";
// Initialisation de l'objet supabase accessible partout
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. VÉRIFICATION AUTOMATIQUE AU CHARGEMENT ---
document.addEventListener("DOMContentLoaded", async () => {
    await verifierAcces();
});

async function verifierAcces() {
    const savedEmail = localStorage.getItem('user_email_app');

    const overlay = document.getElementById('auth-overlay');
    const formDemande = document.getElementById('form-demande');
    const attenteValidation = document.getElementById('attente-validation');

    if (!savedEmail) {
        if (overlay) overlay.style.display = 'flex';
        if (formDemande) formDemande.style.display = 'block';
        if (attenteValidation) attenteValidation.style.display = 'none';
        return;
    }

    // On interroge Supabase dans la table utilisateurs_K1
    const { data, error } = await supabase
        .from('utilisateurs_K1')
        .select('*')
        .eq('email', savedEmail)
        .single();

    if (error || !data) {
        localStorage.removeItem('user_email_app');
        if (overlay) overlay.style.display = 'flex';
        if (formDemande) formDemande.style.display = 'block';
        if (attenteValidation) attenteValidation.style.display = 'none';
        return;
    }

    if (data.valide === true) {
        if (overlay) overlay.style.display = 'none';
    } else {
        if (overlay) overlay.style.display = 'flex';
        if (formDemande) formDemande.style.display = 'none';
        if (attenteValidation) attenteValidation.style.display = 'block';
    }
}

// --- 3. ENREGISTREMENT DE LA DEMANDE D'ACCÈS ---
async function envoyerDemandeAcces() {
    const prenom = document.getElementById('req-prenom').value.trim();
    const nom = document.getElementById('req-nom').value.trim();
    const email = document.getElementById('req-email').value.trim().toLowerCase();

    if (!prenom || !nom || !email) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    const { error } = await supabase
        .from('utilisateurs_K1')
        .insert([{ prenom: prenom, nom: nom, email: email, valide: false }]);

    if (error) {
        alert("Erreur lors de l'enregistrement (peut-être que cet email existe déjà) : " + error.message);
    } else {
        localStorage.setItem('user_email_app', email);
        
        document.getElementById('form-demande').style.display = 'none';
        document.getElementById('attente-validation').style.display = 'block';
    }
}
