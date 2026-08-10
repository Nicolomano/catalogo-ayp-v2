import Category from "../services/models/category.js";

/* -------------------- CREAR CATEGORÍA -------------------- */
export const createCategory = async (req, res) => {
  try {
    const { name, slug, parent = null } = req.body;

    if (!name || !slug) {
      return res
        .status(400)
        .json({ message: "Nombre y slug son obligatorios" });
    }

    const exists = await Category.findOne({ slug });
    if (exists) {
      return res.status(400).json({ message: "El slug ya existe" });
    }

    const newCategory = new Category({ name, slug, parent: parent || null });
    await newCategory.save();

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({
      message: "Error creando categoría",
      error: error.message,
    });
  }
};

/* -------------------- LISTAR TODAS LAS CATEGORÍAS -------------------- */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json(categories);
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo categorías",
      error: error.message,
    });
  }
};

/* -------------------- ÁRBOL DE CATEGORÍAS -------------------- */
/**
 * Devuelve las categorías en formato anidado:
 * [
 *   {
 *     _id, name, slug,
 *     children: [
 *        { _id, name, slug, children: [...] }
 *     ]
 *   }
 * ]
 */
export const getCategoriesTree = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();

    // Indexamos las categorías por ID
    const map = {};
    categories.forEach((cat) => {
      map[cat._id] = { ...cat, children: [] };
    });

    // Construimos el árbol
    const tree = [];
    categories.forEach((cat) => {
      if (cat.parent) {
        if (map[cat.parent]) {
          map[cat.parent].children.push(map[cat._id]);
        }
      } else {
        tree.push(map[cat._id]);
      }
    });

    res.json(tree);
  } catch (error) {
    res.status(500).json({
      message: "Error generando árbol de categorías",
      error: error.message,
    });
  }
};

/* -------------------- ELIMINAR CATEGORÍA -------------------- */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene hijos
    const hasChildren = await Category.exists({ parent: id });
    if (hasChildren) {
      return res.status(400).json({
        message: "No se puede eliminar una categoría que tiene subcategorías",
      });
    }

    await Category.findByIdAndDelete(id);
    res.json({ message: "Categoría eliminada con éxito" });
  } catch (error) {
    res.status(500).json({
      message: "Error eliminando categoría",
      error: error.message,
    });
  }
};
