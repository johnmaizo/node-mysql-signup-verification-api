const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    applicant_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "applicants",
        key: "applicant_id",
      },
      allowNull: false,
      onDelete: "CASCADE",
    },

    form_167: {type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true}, // High School Report Card (Form 167)

    certificate_of_good_moral: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    }, // Certificate of Good Moral

    transcript_of_records: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    }, // Transcript of Records

    nso_birth_certificate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    }, // NSO Birth Certificate

    two_by_two_id_photo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    }, // 2x2 ID Photo

    certificate_of_transfer_credential: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    }, // Certificate of Transfer Credential

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},

    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    timestamps: true,
  };

  return sequelize.define("student_document", attributes, options);
}
