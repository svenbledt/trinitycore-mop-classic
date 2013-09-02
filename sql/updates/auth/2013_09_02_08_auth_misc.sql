/* cs_honor.cpp */

SET @id = 401;

-- Add new permissions
DELETE FROM `rbac_permissions` WHERE `id` BETWEEN @id AND @id+3;
INSERT INTO `rbac_permissions` (`id`, `name`) VALUES
(@id+0, 'honor'),
(@id+1, 'honor add'),
(@id+2, 'honor add kill'),
(@id+3, 'honor update');

-- Add permissions to "corresponding Commands Role"
DELETE FROM `rbac_role_permissions` WHERE `permissionId` BETWEEN @id AND @id+3;
INSERT INTO `rbac_role_permissions` (`roleId`, `permissionId`) VALUES
(4, @id+0),
(4, @id+1),
(4, @id+2),
(4, @id+3);
