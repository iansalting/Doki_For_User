import Menu from "../model/menuModel.js";
import Ingredient from "../model/ingredientModel.js"


const getAllMenu = async (req, res, next) => {
  try {
    // Add query options for filtering and pagination if needed
    const { category, available } = req.query;
    
    // Build query filter
    let filter = {};
    if (category) {
      filter.category = category;
    }
    if (available !== undefined) {
      filter.available = available === 'true';
    }

    const menus = await Menu.find(filter)
      .populate("sizes.ingredients.ingredient")
      .sort({ category: 1, name: 1 }); // Sort by category, then name

    if (!menus || menus.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        categories: [],
        message: "No menu items found"
      });
    }

    const categoriesSet = new Set();

    const menusWithAvailability = await Promise.all(
      menus.map(async (menu) => {
        const menuObj = menu.toObject();

        // Collect category
        if (menuObj.category) {
          categoriesSet.add(menuObj.category);
        }

        const sizesWithAvailability = Array.isArray(menuObj.sizes)
          ? await Promise.all(
              menuObj.sizes.map(async (size) => {
                let isAvailable = true;
                const unavailableIngredients = [];

                // Only check ingredients if they exist
                if (size.ingredients && size.ingredients.length > 0) {
                  for (const menuIngredient of size.ingredients) {
                    const ingredient = menuIngredient.ingredient;
                    const requiredQuantity = menuIngredient.quantity || 1;

                    if (!ingredient) {
                      isAvailable = false;
                      unavailableIngredients.push({
                        name: "Unknown ingredient",
                        reason: "Ingredient not found in inventory",
                      });
                    } else if (
                      typeof ingredient.quantity === 'number' && 
                      ingredient.quantity < requiredQuantity
                    ) {
                      isAvailable = false;
                      unavailableIngredients.push({
                        name: ingredient.name,
                        required: requiredQuantity,
                        available: ingredient.quantity,
                        unit: ingredient.unit || 'units',
                        reason:
                          ingredient.quantity === 0
                            ? "Out of stock"
                            : "Insufficient stock",
                      });
                    }
                  }
                }

                return {
                  _id: size._id,
                  label: size.label,
                  price: size.price,
                  isAvailable,
                  unavailableIngredients:
                    unavailableIngredients.length > 0
                      ? unavailableIngredients
                      : undefined,
                  ingredients: size.ingredients || [], // Ensure it's always an array
                };
              })
            )
          : [];

        // Calculate basePrice - prefer Classic, fall back to first available
        let basePrice = null;
        const classic = sizesWithAvailability.find(
          (s) => s.label === "Classic"
        );
        
        if (classic) {
          basePrice = classic.price;
        } else if (sizesWithAvailability.length > 0) {
          // Get the lowest price as base price
          basePrice = Math.min(...sizesWithAvailability.map(s => s.price));
        }

        // Menu is available if it's marked as available AND has at least one available size
        const isMenuAvailable = menuObj.available && (
          sizesWithAvailability.length > 0
            ? sizesWithAvailability.some((size) => size.isAvailable)
            : true // If no sizes (like drinks), just use the menu's available flag
        );

        // IMAGE URL LOGIC - FIXED FOR CORRECT PORT
        let imageUrl = null;
        if (menuObj.image) {
          // Use the correct image server port (8000) where images are actually served
          imageUrl = `http://localhost:8000/uploads/menu/${menuObj.image}`;
          
          // Alternative: Use environment variable for flexibility
          // const imageServerUrl = process.env.IMAGE_SERVER_URL || 'http://localhost:8000';
          // imageUrl = `${imageServerUrl}/uploads/menu/${menuObj.image}`;
        }

        return {
          _id: menuObj._id,
          name: menuObj.name,
          description: menuObj.description,
          category: menuObj.category,
          available: menuObj.available,
          sizes: sizesWithAvailability,
          isAvailable: isMenuAvailable,
          basePrice,
          // IMAGE FIELDS IN RESPONSE
          image: menuObj.image,
          imageAlt: menuObj.imageAlt,
          imageUrl: imageUrl,
          createdAt: menuObj.createdAt,
          updatedAt: menuObj.updatedAt,
        };
      })
    );

    // Optional: Filter out unavailable items if requested
    const finalMenus = req.query.showUnavailable === 'false' 
      ? menusWithAvailability.filter(menu => menu.isAvailable)
      : menusWithAvailability;

    res.status(200).json({
      success: true,
      data: finalMenus,
      categories: Array.from(categoriesSet).sort(), // Sort categories alphabetically
      total: finalMenus.length,
    });

  } catch (error) {
    console.error('Error in getAllMenu:', error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return next(createHttpError(400, "Invalid menu ID format"));
    }
    
    if (error.name === 'ValidationError') {
      return next(createHttpError(400, `Validation error: ${error.message}`));
    }
    
    // Generic server error
    next(createHttpError(500, "Failed to fetch menu items"));
  }
};

export {getAllMenu};