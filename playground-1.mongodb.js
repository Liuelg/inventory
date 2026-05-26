// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('inventory_db');

// Create a new document in the collection.
db.getCollection('users').insertOne({
    "name": "Liuel",
     "email": "liueltekagirma@gmail.com",
     "password": "$2b$10$KbE7LC6fyEBk25enmbFALevz5DNv4AccBlsMRo22iyFNlgPP9KeE6",
     "role": "stock",
     "is_active": true,
     "createdAt": new Date(),
     "updatedAt": new Date()
  

    }
);
