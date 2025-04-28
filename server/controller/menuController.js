import Menu from "../model/menuModel.js";

const getAllMenu = async (req, res, next) => {
    try {
      const menus = await Menu.find().populate("ingredients.ingredient");
      
      if (!menus || menus.length === 0) {
        return next(createHttpError(404, "No menu items found"));
      }
      
      res.status(200).json({ success: true, data: menus });
    } catch (error) {
      next(error);
    }
  };

  export {getAllMenu};