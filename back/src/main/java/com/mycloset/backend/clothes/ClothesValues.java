package com.mycloset.backend.clothes;

import java.util.LinkedHashSet;

record ClothesValues(
        String alias,
        String category,
        String subcategory,
        String pattern,
        Integer warmthLevel,
        String memo,
        String imageUrl,
        LinkedHashSet<String> colors,
        LinkedHashSet<String> seasons,
        LinkedHashSet<String> styleTags) {}
