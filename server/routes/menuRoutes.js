import express from 'express';
import {getAllMenu} from '../controller/menuController.js';

const router = express.Router();

router.route('/').get(getAllMenu)

export default router;