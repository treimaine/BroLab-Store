// Test script pour vérifier la structure de la table downloads
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variables d'environnement manquantes");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDownloadStructure() {
  console.log("🔍 Test de la structure de la table downloads...\n");

  try {
    // 1. Vérifier la structure de la table
    console.log("📋 Structure de la table downloads:");
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_name", "downloads")
      .eq("table_schema", "public")
      .order("ordinal_position");

    if (columnsError) {
      console.error("❌ Erreur lors de la récupération de la structure:", columnsError);
      return;
    }

    columns.forEach(col => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} ${
          col.is_nullable === "NO" ? "(NOT NULL)" : "(NULL)"
        } ${col.column_default ? `DEFAULT: ${col.column_default}` : ""}`
      );
    });

    // 2. Vérifier les contraintes
    console.log("\n🔒 Contraintes de la table:");
    const { data: constraints, error: constraintsError } = await supabase
      .from("information_schema.table_constraints")
      .select(
        `
        constraint_name,
        constraint_type,
        information_schema.key_column_usage(column_name)
      `
      )
      .eq("table_name", "downloads")
      .eq("table_schema", "public");

    if (constraintsError) {
      console.error("❌ Erreur lors de la récupération des contraintes:", constraintsError);
    } else {
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }

    // 3. Vérifier les clés étrangères
    console.log("\n🔗 Clés étrangères:");
    const { data: foreignKeys, error: fkError } = await supabase
      .from("information_schema.key_column_usage")
      .select(
        `
        column_name,
        referenced_table_name,
        referenced_column_name
      `
      )
      .eq("table_name", "downloads")
      .eq("table_schema", "public")
      .not("referenced_table_name", "is", null);

    if (fkError) {
      console.error("❌ Erreur lors de la récupération des clés étrangères:", fkError);
    } else {
      foreignKeys.forEach(fk => {
        console.log(
          `  - ${fk.column_name} -> ${fk.referenced_table_name}.${fk.referenced_column_name}`
        );
      });
    }

    // 4. Test d'insertion avec différents scénarios
    console.log("\n🧪 Tests d'insertion:");

    // Test 1: Insertion avec product_id seulement
    console.log("\n📦 Test 1: Insertion avec product_id seulement");
    try {
      const { data: test1, error: error1 } = await supabase
        .from("downloads")
        .insert({
          user_id: 1,
          product_id: 999999,
          license: "basic",
          downloaded_at: new Date().toISOString(),
          download_count: 1,
        })
        .select()
        .single();

      if (error1) {
        console.log("  ❌ Échec:", error1.message);
        console.log("  Code d'erreur:", error1.code);
      } else {
        console.log("  ✅ Succès - ID:", test1.id);
        // Nettoyer
        await supabase.from("downloads").delete().eq("id", test1.id);
      }
    } catch (e) {
      console.log("  ❌ Exception:", e.message);
    }

    // Test 2: Insertion avec beat_id seulement
    console.log("\n🎵 Test 2: Insertion avec beat_id seulement");
    try {
      const { data: test2, error: error2 } = await supabase
        .from("downloads")
        .insert({
          user_id: 1,
          beat_id: 999999,
          license: "basic",
          downloaded_at: new Date().toISOString(),
          download_count: 1,
        })
        .select()
        .single();

      if (error2) {
        console.log("  ❌ Échec:", error2.message);
        console.log("  Code d'erreur:", error2.code);
      } else {
        console.log("  ✅ Succès - ID:", test2.id);
        // Nettoyer
        await supabase.from("downloads").delete().eq("id", test2.id);
      }
    } catch (e) {
      console.log("  ❌ Exception:", e.message);
    }

    // Test 3: Insertion avec les deux
    console.log("\n🔄 Test 3: Insertion avec product_id ET beat_id");
    try {
      const { data: test3, error: error3 } = await supabase
        .from("downloads")
        .insert({
          user_id: 1,
          product_id: 999999,
          beat_id: 999999,
          license: "basic",
          downloaded_at: new Date().toISOString(),
          download_count: 1,
        })
        .select()
        .single();

      if (error3) {
        console.log("  ❌ Échec:", error3.message);
        console.log("  Code d'erreur:", error3.code);
      } else {
        console.log("  ✅ Succès - ID:", test3.id);
        // Nettoyer
        await supabase.from("downloads").delete().eq("id", test3.id);
      }
    } catch (e) {
      console.log("  ❌ Exception:", e.message);
    }

    // 5. Vérifier les données existantes
    console.log("\n📊 Données existantes:");
    const { data: existing, error: existingError } = await supabase
      .from("downloads")
      .select("*")
      .limit(5);

    if (existingError) {
      console.error("❌ Erreur lors de la récupération des données:", existingError);
    } else {
      console.log(`  Total d'enregistrements: ${existing.length}`);
      existing.forEach((record, index) => {
        console.log(
          `  ${index + 1}. ID: ${record.id}, User: ${record.user_id}, Product: ${
            record.product_id || "N/A"
          }, Beat: ${record.beat_id || "N/A"}, License: ${record.license}`
        );
      });
    }
  } catch (error) {
    console.error("🚨 Erreur générale:", error);
  }
}

// Exécuter le test
testDownloadStructure()
  .then(() => {
    console.log("\n✅ Test terminé");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });
